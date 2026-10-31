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
        var line = RatingEngine.Rate(Answers.WorkedExample with { Postcode = postcode }).Line("Postcode where the car is kept");

        Assert.Equal(detail, line.Detail);
        Assert.Equal((decimal)factor, line.Multiplier);
    }

    [Theory]
    [InlineData("CB1 2AB", "CB")]
    [InlineData("S1 1AA", "S")]
    [InlineData("ZE1 0AA", "ZE")]
    public void An_area_in_no_band_is_band_B_and_changes_nothing(string postcode, string area)
    {
        var line = RatingEngine.Rate(Answers.WorkedExample with { Postcode = postcode }).Line("Postcode where the car is kept");

        Assert.Equal($"{area} postcode area, band B", line.Detail);
        Assert.Equal(1.0m, line.Multiplier);
    }

    [Fact]
    public void The_UK_has_121_postcode_areas()
    {
        Assert.Equal(121, PostcodeAreas.Uk.Count);
    }

    [Theory]
    [InlineData("GY")]
    [InlineData("JE")]
    [InlineData("IM")]
    [InlineData("BF")]
    [InlineData("BX")]
    [InlineData("ZZ")]
    public void The_crown_dependencies_and_non_geographic_codes_are_not_on_the_list(string area)
    {
        Assert.DoesNotContain(area, PostcodeAreas.Uk);
    }

    [Fact]
    public void Every_area_in_the_band_table_is_on_the_list()
    {
        Assert.NotEmpty(RatingEngine.BandedAreas);
        Assert.All(RatingEngine.BandedAreas, area => Assert.Contains(area, PostcodeAreas.Uk));
    }

    [Theory]
    [InlineData("ZZ99 9ZZ")]
    [InlineData("GY1 1AA")]
    [InlineData("JE2 3AB")]
    [InlineData("IM1 1AA")]
    public void The_engine_throws_on_an_area_not_on_the_list(string postcode)
    {
        Assert.Throws<ArgumentException>(() => RatingEngine.Rate(Answers.WorkedExample with { Postcode = postcode }));
    }
}
