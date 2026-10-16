using System.Text.Json.Nodes;

namespace Fenmoor.Api.Tests;

/// <summary>
/// One 400 test per rule family. Each takes the worked example, spoils one answer, and checks that
/// the failing fields are named, only those, with the browser's message (validation.ts, word for word).
/// "REMOVE" leaves the answer out of the body.
/// </summary>
public class RefusalTests
{
    private static async Task AssertRefusedAsync(string field, string valueJson, string expectedKeys, string expectedMessage)
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        if (valueJson == "REMOVE")
        {
            body.Remove(field);
        }
        else
        {
            body[field] = JsonNode.Parse(valueJson);
        }

        var response = await api.PostQuoteAsync(body);

        Assert.Equal(expectedKeys.Split(','), ValidationAssert.ErrorKeys(response));
        Assert.Equal(expectedMessage, ValidationAssert.Message(response, field));
    }

    // Step 1, your car
    [Theory]
    [InlineData("vehicleId", "\"no-such-car\"", "vehicleId", "Choose your car")]
    [InlineData("vehicleId", "\"\"", "vehicleId", "Choose your car")]
    [InlineData("vehicleId", "REMOVE", "vehicleId", "Choose your car")]
    [InlineData("carValue", "499", "carValue", "Enter a value between £500 and £250,000")]
    [InlineData("carValue", "250001", "carValue", "Enter a value between £500 and £250,000")]
    [InlineData("carValue", "\"abc\"", "carValue", "Enter the car’s value in whole pounds, like 12000")]
    [InlineData("carValue", "14500.5", "carValue", "Enter the car’s value in whole pounds, like 12000")]
    [InlineData("carValue", "REMOVE", "carValue", "Enter the car’s value in whole pounds, like 12000")]
    [InlineData("overnight", "\"basement\"", "overnight", "Choose where the car is kept overnight")]
    [InlineData("overnight", "1", "overnight", "Choose where the car is kept overnight")]
    [InlineData("overnight", "REMOVE", "overnight", "Choose where the car is kept overnight")]
    [InlineData("mileage", "\"lots\"", "mileage", "Choose your annual mileage")]
    [InlineData("mileage", "REMOVE", "mileage", "Choose your annual mileage")]
    [InlineData("use", "\"racing\"", "use", "Choose what the car is used for")]
    [InlineData("use", "REMOVE", "use", "Choose what the car is used for")]
    public Task Your_car_answers(string field, string valueJson, string expectedKeys, string expectedMessage) =>
        AssertRefusedAsync(field, valueJson, expectedKeys, expectedMessage);

    // Step 2, about you. Today is 16 October 2026 and the driver is 42.
    [Theory]
    [InlineData("dateOfBirth", "\"2012-01-01\"", "dateOfBirth,licenceYears", "You need to be 17 or over to get a quote")]
    [InlineData("dateOfBirth", "\"1926-10-15\"", "dateOfBirth", "Check the year of your date of birth")]
    [InlineData("dateOfBirth", "\"12/03/1984\"", "dateOfBirth", "Enter your date of birth")]
    [InlineData("dateOfBirth", "REMOVE", "dateOfBirth", "Enter your date of birth")]
    [InlineData("licenceYears", "-1", "licenceYears", "Enter the number of whole years, like 5")]
    [InlineData("licenceYears", "2.5", "licenceYears", "Enter the number of whole years, like 5")]
    [InlineData("licenceYears", "REMOVE", "licenceYears", "Enter the number of whole years, like 5")]
    [InlineData("licenceYears", "26", "licenceYears", "At 42 you can have held a licence for 25 years at most")]
    [InlineData("postcode", "\"ZZ\"", "postcode", "Enter a full UK postcode, like PE38 9AB")]
    [InlineData("postcode", "\"PE38\"", "postcode", "Enter a full UK postcode, like PE38 9AB")]
    [InlineData("postcode", "\"\"", "postcode", "Enter a full UK postcode, like PE38 9AB")]
    [InlineData("postcode", "REMOVE", "postcode", "Enter a full UK postcode, like PE38 9AB")]
    [InlineData("noClaimsYears", "-1", "noClaimsYears", "Enter the number of whole years, like 4")]
    [InlineData("noClaimsYears", "21", "noClaimsYears", "No-claims years can’t be more than the years you’ve held a licence")]
    [InlineData("claimsLast5Years", "3", "claimsLast5Years", "Choose how many claims you’ve made")]
    [InlineData("claimsLast5Years", "-1", "claimsLast5Years", "Choose how many claims you’ve made")]
    [InlineData("claimsLast5Years", "REMOVE", "claimsLast5Years", "Choose how many claims you’ve made")]
    public Task About_you_answers(string field, string valueJson, string expectedKeys, string expectedMessage) =>
        AssertRefusedAsync(field, valueJson, expectedKeys, expectedMessage);

    // An 18-year-old can have held a licence for one year at most: "1 year", not "1 years".
    [Fact]
    public async Task At_18_the_most_is_one_year()
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["dateOfBirth"] = "2008-01-01";
        body["licenceYears"] = 2;
        body["noClaimsYears"] = 0;

        var response = await api.PostQuoteAsync(body);

        Assert.Equal(["licenceYears"], ValidationAssert.ErrorKeys(response));
        Assert.Equal("At 18 you can have held a licence for 1 year at most", ValidationAssert.Message(response, "licenceYears"));
    }

    // Step 3, your cover
    [Theory]
    [InlineData("cover", "\"gold\"", "cover", "Choose a level of cover")]
    [InlineData("cover", "REMOVE", "cover", "Choose a level of cover")]
    [InlineData("voluntaryExcess", "50", "voluntaryExcess", "Choose a voluntary excess")]
    [InlineData("voluntaryExcess", "REMOVE", "voluntaryExcess", "Choose a voluntary excess")]
    [InlineData("startDate", "\"2026-10-15\"", "startDate", "Choose a start date from today up to 30 days ahead")]
    [InlineData("startDate", "\"2026-11-16\"", "startDate", "Choose a start date from today up to 30 days ahead")]
    [InlineData("startDate", "\"soon\"", "startDate", "Enter the date you want cover to start")]
    [InlineData("startDate", "REMOVE", "startDate", "Enter the date you want cover to start")]
    [InlineData("breakdown", "\"yes\"", "breakdown", "Say whether you want breakdown cover")]
    public Task Your_cover_answers(string field, string valueJson, string expectedKeys, string expectedMessage) =>
        AssertRefusedAsync(field, valueJson, expectedKeys, expectedMessage);

    [Fact]
    public async Task Several_spoiled_answers_are_all_named_and_nothing_else_is()
    {
        var api = new ApiHarness();
        var body = ApiHarness.WorkedExampleBody();
        body["postcode"] = "nonsense";
        body["cover"] = "gold";
        body["carValue"] = 5;

        var response = await api.PostQuoteAsync(body);

        Assert.Equal(["carValue", "postcode", "cover"], ValidationAssert.ErrorKeys(response));
    }
}
