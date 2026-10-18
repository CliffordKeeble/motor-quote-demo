using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;

namespace Fenmoor.Api.Tests;

public class QuoteEndpointTests
{
    private static byte[] Golden() =>
        File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "contracts", "quote-worked-example.json"));

    [Fact]
    public async Task The_worked_example_returns_200_and_the_golden_file_byte_for_byte()
    {
        var api = new ApiHarness();

        var response = await api.PostQuoteAsync(ApiHarness.WorkedExampleBody());

        Assert.Equal(200, response.Status);
        Assert.StartsWith("application/json", response.ContentType, StringComparison.Ordinal);
        var golden = Golden();
        Assert.Equal(Encoding.UTF8.GetString(golden), response.Text);
        Assert.Equal(golden, response.Body);
    }

    [Fact]
    public async Task The_quote_is_valid_for_30_days_from_the_London_date()
    {
        var api = new ApiHarness();

        var response = await api.PostQuoteAsync(ApiHarness.WorkedExampleBody());

        Assert.Equal("2026-11-15", JsonNode.Parse(response.Text)!["validUntil"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("2026-10-16")]
    [InlineData("2026-11-15")]
    public async Task The_first_and_last_days_of_the_window_are_accepted(string startDate)
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["startDate"] = startDate;

        Assert.Equal(200, (await api.PostQuoteAsync(body)).Status);
    }

    [Theory]
    [InlineData("2026-10-15")]
    [InlineData("2026-11-16")]
    public async Task A_start_date_of_yesterday_or_31_days_ahead_is_refused(string startDate)
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["startDate"] = startDate;

        var response = await api.PostQuoteAsync(body);

        Assert.Equal(400, response.Status);
        Assert.Equal(["startDate"], ValidationAssert.ErrorKeys(response));
    }

    [Fact]
    public async Task Today_is_the_London_date_not_the_UTC_date()
    {
        // 23:30 UTC on 23 October is 00:30 BST on the 24th. In London the 23rd is already yesterday.
        var api = new ApiHarness(new DateTimeOffset(2026, 10, 23, 23, 30, 0, TimeSpan.Zero));

        var yesterdayInLondon = await api.PostQuoteAsync(ApiHarness.WorkedExampleBody());
        var body = ApiHarness.WorkedExampleBody();
        body["startDate"] = "2026-10-24";
        var todayInLondon = await api.PostQuoteAsync(body);

        Assert.Equal(400, yesterdayInLondon.Status);
        Assert.Equal(200, todayInLondon.Status);
        Assert.Equal("2026-11-23", JsonNode.Parse(todayInLondon.Text)!["validUntil"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("cover", "tpft")]
    [InlineData("cover", "tpo")]
    [InlineData("overnight", "garage")]
    [InlineData("overnight", "street")]
    [InlineData("mileage", "under5k")]
    [InlineData("mileage", "10to15k")]
    [InlineData("mileage", "over15k")]
    [InlineData("use", "social")]
    [InlineData("use", "business")]
    public async Task Every_enum_string_the_form_sends_is_accepted(string field, string value)
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body[field] = value;

        Assert.Equal(200, (await api.PostQuoteAsync(body)).Status);
    }

    [Fact]
    public async Task Third_party_only_through_the_function_has_no_car_value_line()
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["cover"] = "tpo";

        var response = await api.PostQuoteAsync(body);

        var labels = JsonNode.Parse(response.Text)!["lines"]!.AsArray().Select(l => l!["label"]!.GetValue<string>());
        Assert.DoesNotContain("Car value", labels);
    }

    [Fact]
    public async Task A_body_that_is_not_JSON_is_refused_under_the_key_request()
    {
        var api = new ApiHarness();

        var response = await api.PostQuoteAsync("{ this is not json");

        Assert.Equal(400, response.Status);
        Assert.Equal(["request"], ValidationAssert.ErrorKeys(response));
    }

    [Fact]
    public async Task The_seven_cars_come_back_with_the_contracts_strings()
    {
        var api = new ApiHarness();

        var response = await api.GetVehiclesAsync();

        Assert.Equal(200, response.Status);
        var cars = JsonNode.Parse(response.Text)!.AsArray();
        Assert.Equal(
            ["ford-fiesta-2019", "toyota-yaris-2022", "vw-golf-2021", "alfa-giulietta-2010", "nissan-leaf-2020", "bmw-320d-2020", "tesla-model3-2023"],
            cars.Select(c => c!["id"]!.GetValue<string>()));
        Assert.Equal("Petrol", cars[0]!["fuel"]!.GetValue<string>());
        Assert.Equal(17, cars[2]!["group"]!.GetValue<int>());
        Assert.Equal("Diesel", cars[3]!["fuel"]!.GetValue<string>());
    }

    [Fact]
    public void A_reference_is_FM_and_six_characters()
    {
        var reference = new RandomReferenceGenerator().NewReference();

        Assert.Matches("^FM-[A-Z0-9]{6}$", reference);
    }

    [Fact]
    public async Task A_valid_quote_writes_exactly_one_information_line_with_the_reference_and_premium()
    {
        var api = new ApiHarness();

        await api.PostQuoteAsync(ApiHarness.WorkedExampleBody());

        var line = Assert.Single(api.Log.Entries);
        Assert.Equal(LogLevel.Information, line.Level);
        Assert.Contains("FM-ABC123", line.Message, StringComparison.Ordinal);
        Assert.Contains("227.19", line.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_refused_request_writes_exactly_one_warning_line_naming_the_fields_only()
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["postcode"] = "ZZ";
        body["carValue"] = 100;

        await api.PostQuoteAsync(body);

        var line = Assert.Single(api.Log.Entries);
        Assert.Equal(LogLevel.Warning, line.Level);
        Assert.Contains("carValue", line.Message, StringComparison.Ordinal);
        Assert.Contains("postcode", line.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task No_log_line_from_a_valid_quote_or_a_refused_one_holds_any_answer()
    {
        var api = new ApiHarness();
        await api.PostQuoteAsync(ApiHarness.WorkedExampleBody());

        var refused = ApiHarness.WorkedExampleBody();
        refused["postcode"] = "ZZ9 9ZZ x";
        refused["dateOfBirth"] = "1984-03-12";
        refused["carValue"] = 100;
        await api.PostQuoteAsync(refused);
        await api.PostQuoteAsync("{\"dateOfBirth\": \"1984-03-12\", \"postcode\": \"PE38 9AB\", \"carValue\": \"abc\"}");

        Assert.Equal(3, api.Log.Entries.Count);
        foreach (var entry in api.Log.Entries)
        {
            foreach (var answer in new[] { "1984", "03-12", "PE38", "9AB", "ZZ9", "9ZZ" })
            {
                Assert.DoesNotContain(answer, entry.Everything, StringComparison.OrdinalIgnoreCase);
            }
        }
    }
}

internal static class ValidationAssert
{
    /// <summary>The keys of the problem details' errors, in the order the response lists them.</summary>
    public static string[] ErrorKeys(ApiResponse response)
    {
        Assert.Equal(400, response.Status);
        Assert.StartsWith("application/problem+json", response.ContentType, StringComparison.Ordinal);
        using var document = JsonDocument.Parse(response.Body);
        Assert.Equal(400, document.RootElement.GetProperty("status").GetInt32());
        return [.. document.RootElement.GetProperty("errors").EnumerateObject().Select(p => p.Name)];
    }

    public static string Message(ApiResponse response, string field)
    {
        using var document = JsonDocument.Parse(response.Body);
        var messages = document.RootElement.GetProperty("errors").GetProperty(field).EnumerateArray().ToList();
        return Assert.Single(messages).GetString()!;
    }
}
