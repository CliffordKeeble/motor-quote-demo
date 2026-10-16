using System.Text;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;

namespace Fenmoor.Api.Tests;

/// <summary>What came back: status, content type and the exact bytes of the body.</summary>
internal sealed record ApiResponse(int Status, string? ContentType, byte[] Body)
{
    public string Text => Encoding.UTF8.GetString(Body);
}

internal sealed class FixedReferences(string reference) : IReferenceGenerator
{
    public string NewReference() => reference;
}

internal sealed record LogEntry(LogLevel Level, string Message, string State, string Exception)
{
    /// <summary>Everything the line carries, as one string to search.</summary>
    public string Everything => $"{Message} | {State} | {Exception}";
}

/// <summary>Keeps every line written to it, with the values that went into it.</summary>
internal sealed class CapturingLogger<T> : ILogger<T>
{
    public List<LogEntry> Entries { get; } = [];

    public IDisposable? BeginScope<TState>(TState state)
        where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel) => true;

    public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
    {
        var values = state is IEnumerable<KeyValuePair<string, object?>> pairs
            ? string.Join("; ", pairs.Select(p => $"{p.Key}={p.Value}"))
            : string.Empty;
        Entries.Add(new LogEntry(logLevel, formatter(state, exception), values, exception?.ToString() ?? string.Empty));
    }
}

/// <summary>
/// The functions, with a fixed clock and a fixed reference. A result is run through the same MVC
/// result executors the Functions host uses, so the body is the bytes a caller would receive.
/// </summary>
internal sealed class ApiHarness
{
    /// <summary>12:00 UTC on 16 October 2026: 13:00 in London, the same date.</summary>
    public static readonly DateTimeOffset NoonOnTheSixteenth = new(2026, 10, 16, 12, 0, 0, TimeSpan.Zero);

    private readonly ServiceProvider _services;
    private readonly QuoteFunctions _functions;

    public ApiHarness(DateTimeOffset? now = null)
    {
        Clock = new FakeTimeProvider(now ?? NoonOnTheSixteenth);

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddControllers();
        services.AddFenmoorApi();
        _services = services.BuildServiceProvider();

        _functions = new QuoteFunctions(Clock, new FixedReferences("FM-ABC123"), Log);
    }

    public FakeTimeProvider Clock { get; }

    public CapturingLogger<QuoteFunctions> Log { get; } = new();

    /// <summary>The worked example's fifteen answers, as the browser sends them.</summary>
    public static JsonObject WorkedExampleBody() => new()
    {
        ["vehicleId"] = "vw-golf-2021",
        ["carValue"] = 14500,
        ["overnight"] = "driveway",
        ["mileage"] = "5to10k",
        ["use"] = "commuting",
        ["dateOfBirth"] = "1984-03-12",
        ["licenceYears"] = 20,
        ["postcode"] = "PE38 9AB",
        ["noClaimsYears"] = 6,
        ["claimsLast5Years"] = 0,
        ["cover"] = "comprehensive",
        ["voluntaryExcess"] = 250,
        ["startDate"] = "2026-10-23",
        ["breakdown"] = true,
        ["legalExpenses"] = false,
    };

    public async Task<ApiResponse> GetVehiclesAsync()
    {
        var context = NewContext(string.Empty);
        return await RunAsync(context, QuoteFunctions.GetVehicles(context.Request));
    }

    public async Task<ApiResponse> PostQuoteAsync(string json)
    {
        var context = NewContext(json);
        return await RunAsync(context, await _functions.PostQuote(context.Request));
    }

    public Task<ApiResponse> PostQuoteAsync(JsonObject body) => PostQuoteAsync(body.ToJsonString());

    private DefaultHttpContext NewContext(string requestBody)
    {
        var context = new DefaultHttpContext { RequestServices = _services };
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(requestBody));
        context.Request.ContentType = "application/json";
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static async Task<ApiResponse> RunAsync(DefaultHttpContext context, IActionResult result)
    {
        await result.ExecuteResultAsync(new ActionContext(context, new RouteData(), new ActionDescriptor()));
        return new ApiResponse(
            context.Response.StatusCode,
            context.Response.ContentType,
            ((MemoryStream)context.Response.Body).ToArray());
    }
}
