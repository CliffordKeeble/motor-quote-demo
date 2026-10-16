namespace Fenmoor.Rating.Tests;

public class RoundingTests
{
    // Where rounding half away from zero and rounding half to even part company.
    //
    // One year's no-claims bonus is a factor of 0.85. A running total whose pence are 10 mod 20
    // times 0.85 ends in exactly half a penny. Here it is 324.50 x 0.85 = 275.825: away from zero
    // is 275.83, and to even is 275.82. The worked example never lands on a half penny, so it
    // passes under either mode. This test is what holds the mode.
    private static readonly RatingRequest HalfPenny = new(
        VehicleId: "ford-fiesta-2019",
        CarValue: 4000,
        Overnight: Overnight.Garage,
        Mileage: Mileage.Under5000,
        Use: CarUse.Commuting,
        DateOfBirth: new DateOnly(1984, 3, 12),
        LicenceYears: 20,
        Postcode: "PE38 9AB",
        NoClaimsYears: 1,
        ClaimsLast5Years: 1,
        Cover: CoverLevel.Comprehensive,
        VoluntaryExcess: 250,
        StartDate: Answers.StartDate,
        Breakdown: true,
        LegalExpenses: false);

    [Fact]
    public void An_exact_half_penny_rounds_away_from_zero()
    {
        var quote = RatingEngine.Rate(HalfPenny);

        var bonus = quote.Line("No-claims bonus");
        Assert.Equal(324.50m, quote.Lines[quote.Lines.ToList().IndexOf(bonus) - 1].RunningTotal);
        Assert.Equal(275.83m, bonus.RunningTotal);
        Assert.Equal(-48.67m, bonus.Amount);
        Assert.Equal(337.70m, quote.Annual);
    }
}
