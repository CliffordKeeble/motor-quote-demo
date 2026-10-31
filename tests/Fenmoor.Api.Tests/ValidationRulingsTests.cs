using System.Text.Json.Nodes;

namespace Fenmoor.Api.Tests;

/// <summary>
/// The server half of Flint's 22 October rulings (board A24): age is judged on the dates the price
/// uses (E), the licence check runs only on a valid age (D), a postcode area outside the UK is
/// refused (N1). "Today" is 16 October 2026 unless a test says otherwise, so the last start date
/// allowed is 15 November 2026.
/// </summary>
public class ValidationRulingsTests
{
    private const string BirthdayMessage = "You need to be 17 within the next 30 days to get a quote";

    // A young driver: no licence, no no-claims bonus, born on `born`, starting on `start`.
    private static JsonObject YoungDriver(string born, string start, int licenceYears = 0)
    {
        var body = ApiHarness.WorkedExampleBody();
        body["dateOfBirth"] = born;
        body["licenceYears"] = licenceYears;
        body["noClaimsYears"] = 0;
        body["startDate"] = start;
        return body;
    }

    private static string AgeLine(ApiResponse response) =>
        JsonNode.Parse(response.Text)!["lines"]!.AsArray()
            .Single(line => line!["label"]!.GetValue<string>() == "Your age")!["detail"]!.GetValue<string>();

    [Fact]
    public async Task A_16_year_old_17_in_ten_days_may_start_on_the_birthday_and_not_the_day_before()
    {
        var api = new ApiHarness();

        var before = await api.PostQuoteAsync(YoungDriver("2009-10-26", "2026-10-25"));
        var on = await api.PostQuoteAsync(YoungDriver("2009-10-26", "2026-10-26"));

        Assert.Equal(["startDate"], ValidationAssert.ErrorKeys(before));
        Assert.Equal("Choose a start date on or after your 17th birthday, 26 October 2026", ValidationAssert.Message(before, "startDate"));
        Assert.Equal(200, on.Status);
        Assert.Equal("17 on the start date", AgeLine(on));
    }

    [Fact]
    public async Task A_17th_birthday_30_days_out_passes_and_31_days_out_is_refused()
    {
        var api = new ApiHarness();

        var thirty = await api.PostQuoteAsync(YoungDriver("2009-11-15", "2026-11-15"));
        var thirtyOne = await api.PostQuoteAsync(YoungDriver("2009-11-16", "2026-11-15"));

        Assert.Equal(200, thirty.Status);
        Assert.Equal(["dateOfBirth"], ValidationAssert.ErrorKeys(thirtyOne));
        Assert.Equal(BirthdayMessage, ValidationAssert.Message(thirtyOne, "dateOfBirth"));
    }

    [Fact]
    public async Task Born_in_2030_gives_one_message_on_the_date_of_birth_and_nothing_else()
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["dateOfBirth"] = "2030-01-01";

        var response = await api.PostQuoteAsync(body);

        Assert.Equal(["dateOfBirth"], ValidationAssert.ErrorKeys(response));
        Assert.Equal(BirthdayMessage, ValidationAssert.Message(response, "dateOfBirth"));
    }

    [Fact]
    public async Task A_16_year_old_with_no_licence_passes_the_licence_check()
    {
        var api = new ApiHarness();

        var response = await api.PostQuoteAsync(YoungDriver("2009-10-26", "2026-10-26", licenceYears: 0));

        Assert.Equal(200, response.Status);
    }

    [Fact]
    public async Task A_16_year_old_with_one_year_is_told_the_most_is_0_years()
    {
        var api = new ApiHarness();

        var response = await api.PostQuoteAsync(YoungDriver("2009-10-26", "2026-10-26", licenceYears: 1));

        Assert.Equal(["licenceYears"], ValidationAssert.ErrorKeys(response));
        Assert.Equal("At 16 you can have held a licence for 0 years at most", ValidationAssert.Message(response, "licenceYears"));
    }

    [Fact]
    public async Task A_29_February_birth_turns_17_on_1_March_in_a_common_year()
    {
        var api = new ApiHarness(new DateTimeOffset(2029, 2, 10, 12, 0, 0, TimeSpan.Zero));

        var twentyEighth = await api.PostQuoteAsync(YoungDriver("2012-02-29", "2029-02-28"));
        var firstOfMarch = await api.PostQuoteAsync(YoungDriver("2012-02-29", "2029-03-01"));

        Assert.Equal(["startDate"], ValidationAssert.ErrorKeys(twentyEighth));
        Assert.Equal("Choose a start date on or after your 17th birthday, 1 March 2029", ValidationAssert.Message(twentyEighth, "startDate"));
        Assert.Equal(200, firstOfMarch.Status);
        Assert.Equal("17 on the start date", AgeLine(firstOfMarch));
    }

    [Fact]
    public async Task An_area_that_is_not_in_the_UK_is_refused_with_the_area_message()
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["postcode"] = "ZZ99 9ZZ";

        var response = await api.PostQuoteAsync(body);

        Assert.Equal(["postcode"], ValidationAssert.ErrorKeys(response));
        Assert.Equal("We don’t recognise that postcode area. Enter a full UK postcode, like PE38 9AB", ValidationAssert.Message(response, "postcode"));
    }

    [Theory]
    [InlineData("GY1 1AA")]
    [InlineData("JE2 3AB")]
    [InlineData("IM1 1AA")]
    public async Task The_crown_dependencies_are_refused(string postcode)
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["postcode"] = postcode;

        var response = await api.PostQuoteAsync(body);

        Assert.Equal(["postcode"], ValidationAssert.ErrorKeys(response));
    }

    [Fact]
    public async Task A_real_area_outside_the_band_table_is_priced_as_band_B()
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["postcode"] = "ZE1 0AA";

        var response = await api.PostQuoteAsync(body);

        Assert.Equal(200, response.Status);
        var line = JsonNode.Parse(response.Text)!["lines"]!.AsArray()
            .Single(l => l!["label"]!.GetValue<string>() == "Postcode where the car is kept")!;
        Assert.Equal("ZE postcode area, band B", line["detail"]!.GetValue<string>());
        Assert.Equal(1.0m, line["multiplier"]!.GetValue<decimal>());
    }
}
