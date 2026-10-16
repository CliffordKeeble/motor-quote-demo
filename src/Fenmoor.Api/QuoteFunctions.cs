using Fenmoor.Rating;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace Fenmoor.Api;

/// <summary>
/// GET /api/vehicles and POST /api/quote. Static Web Apps puts the /api prefix on.
/// Nothing is stored, and no answer is ever written to a log: the logs say which quote was
/// issued and which fields were refused, and nothing a customer typed.
/// </summary>
public sealed partial class QuoteFunctions
{
    private const string ProblemType = "https://tools.ietf.org/html/rfc9110#section-15.5.1";

    private readonly TimeProvider _clock;
    private readonly IReferenceGenerator _references;
    private readonly ILogger<QuoteFunctions> _logger;

    public QuoteFunctions(TimeProvider clock, IReferenceGenerator references, ILogger<QuoteFunctions> logger)
    {
        _clock = clock;
        _references = references;
        _logger = logger;
    }

    [Function("GetVehicles")]
    public static IActionResult GetVehicles(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "vehicles")] HttpRequest req)
    {
        ArgumentNullException.ThrowIfNull(req);
        return new OkObjectResult(VehicleCatalogue.All);
    }

    [Function("PostQuote")]
    public async Task<IActionResult> PostQuote(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "quote")] HttpRequest req)
    {
        ArgumentNullException.ThrowIfNull(req);

        var read = await QuoteRequestReader.ReadAsync(req.Body, req.HttpContext.RequestAborted);
        if (read.Request is not { } request)
        {
            return Refuse(new Dictionary<string, string> { ["request"] = "The request body is not valid JSON." });
        }

        var today = LondonTime.Today(_clock);
        var checkedRequest = QuoteValidator.Validate(request, today, read.Unreadable);
        if (checkedRequest.Rating is not { } rating)
        {
            return Refuse(checkedRequest.Errors);
        }

        var rated = RatingEngine.Rate(rating);
        var quote = new QuoteResponse(
            _references.NewReference(),
            today.AddDays(QuoteValidator.LastStartDateOffsetDays),
            rated.Lines,
            rated.Annual,
            rated.Monthly,
            rated.CompulsoryExcess,
            rated.VoluntaryExcess);

        QuoteIssued(quote.Reference, quote.Annual);
        return new OkObjectResult(quote);
    }

    private BadRequestObjectResult Refuse(IReadOnlyDictionary<string, string> errors)
    {
        QuoteRefused(string.Join(", ", errors.Keys));

        var problem = new ValidationProblemDetails(errors.ToDictionary(e => e.Key, e => new[] { e.Value }))
        {
            Type = ProblemType,
            Title = "One or more answers were refused.",
            Status = StatusCodes.Status400BadRequest,
        };
        return new BadRequestObjectResult(problem) { ContentTypes = { "application/problem+json" } };
    }

    [LoggerMessage(EventId = 1, Level = LogLevel.Information, Message = "Quote {Reference} issued, annual premium {AnnualPremium}")]
    private partial void QuoteIssued(string reference, decimal annualPremium);

    [LoggerMessage(EventId = 2, Level = LogLevel.Warning, Message = "Quote request refused, failing fields: {Fields}")]
    private partial void QuoteRefused(string fields);
}
