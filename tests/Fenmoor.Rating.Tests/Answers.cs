namespace Fenmoor.Rating.Tests;

internal static class Answers
{
    public static readonly DateOnly StartDate = new(2026, 10, 23);

    /// <summary>
    /// The worked example: the fifteen answers behind the quote in the prototype's screenshot
    /// 5-quote.png. £227.19 a year.
    /// </summary>
    public static RatingRequest WorkedExample { get; } = new(
        VehicleId: "vw-golf-2021",
        CarValue: 14500,
        Overnight: Overnight.Driveway,
        Mileage: Mileage.From5000To10000,
        Use: CarUse.Commuting,
        DateOfBirth: new DateOnly(1984, 3, 12),
        LicenceYears: 20,
        Postcode: "PE38 9AB",
        NoClaimsYears: 6,
        ClaimsLast5Years: 0,
        Cover: CoverLevel.Comprehensive,
        VoluntaryExcess: 250,
        StartDate: StartDate,
        Breakdown: true,
        LegalExpenses: false);

    /// <summary>The line with this label. Fails the test if it is not there, or is there twice.</summary>
    public static QuoteLine Line(this RatedQuote quote, string label) => quote.Lines.Single(l => l.Label == label);
}
