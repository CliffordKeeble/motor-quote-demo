namespace Fenmoor.Rating.Tests;

public class PostcodeTests
{
    [Theory]
    [InlineData("pe38 9ab", "PE")]
    [InlineData(" PE389AB", "PE")]
    [InlineData("W1A 1AA", "W")]
    [InlineData("EC1A 1BB", "EC")]
    [InlineData("B1 1AA", "B")]
    public void The_area_is_the_letters_at_the_start(string postcode, string area)
    {
        Assert.Equal(area, RatingEngine.PostcodeArea(postcode));
    }

    [Theory]
    [InlineData("pe38 9ab", "PE postcode area, band A", 0.85)]
    [InlineData(" PE389AB", "PE postcode area, band A", 0.85)]
    [InlineData("W1A 1AA", "W postcode area, band D", 1.6)]
    [InlineData("EC1A 1BB", "EC postcode area, band D", 1.6)]
    [InlineData("B1 1AA", "B postcode area, band C", 1.25)]
    public void The_area_sets_the_band(string postcode, string detail, double factor)
    {
        var line = RatingEngine.Rate(Answers.WorkedExample with { Postcode = postcode }).Line("Where you live");

        Assert.Equal(detail, line.Detail);
        Assert.Equal((decimal)factor, line.Multiplier);
    }

    [Theory]
    [InlineData("CB1 2AB", "CB")]
    [InlineData("S1 1AA", "S")]
    public void An_area_in_no_band_is_band_B_and_changes_nothing(string postcode, string area)
    {
        var line = RatingEngine.Rate(Answers.WorkedExample with { Postcode = postcode }).Line("Where you live");

        Assert.Equal($"{area} postcode area, band B", line.Detail);
        Assert.Equal(1.0m, line.Multiplier);
    }
}
