namespace Fenmoor.Rating.Tests;

public class BandEdgeTests
{
    private static decimal Multiplier(RatingRequest request, string label) =>
        RatingEngine.Rate(request).Line(label).Multiplier!.Value;

    // The driver is `age` on the start date, with the birthday on the start date itself.
    private static RatingRequest AgedOnBirthday(int age) =>
        Answers.WorkedExample with { DateOfBirth = Answers.StartDate.AddYears(-age) };

    [Theory]
    [InlineData(20, 2.6)]
    [InlineData(21, 1.8)]
    [InlineData(24, 1.8)]
    [InlineData(25, 1.25)]
    [InlineData(29, 1.25)]
    [InlineData(30, 1.0)]
    [InlineData(49, 1.0)]
    [InlineData(50, 0.9)]
    [InlineData(69, 0.9)]
    [InlineData(70, 1.15)]
    public void Age_bands_change_on_the_birthday_itself(int age, double factor)
    {
        var request = AgedOnBirthday(age) with { LicenceYears = 0, NoClaimsYears = 0 };

        var quote = RatingEngine.Rate(request);

        Assert.Equal((decimal)factor, quote.Line("Your age").Multiplier);
        Assert.Equal($"{age} on the start date", quote.Line("Your age").Detail);
    }

    [Theory]
    [InlineData(21, 2.6)]
    [InlineData(25, 1.8)]
    [InlineData(30, 1.25)]
    [InlineData(50, 1.0)]
    [InlineData(70, 0.9)]
    public void The_day_before_the_birthday_is_still_the_younger_band(int age, double factor)
    {
        var request = AgedOnBirthday(age) with
        {
            DateOfBirth = Answers.StartDate.AddYears(-age).AddDays(1),
            LicenceYears = 0,
            NoClaimsYears = 0,
        };

        Assert.Equal((decimal)factor, Multiplier(request, "Your age"));
    }

    [Theory]
    [InlineData(0, 1.4)]
    [InlineData(1, 1.2)]
    [InlineData(2, 1.2)]
    [InlineData(3, 1.05)]
    [InlineData(4, 1.05)]
    [InlineData(5, 1.0)]
    public void Licence_years_bands(int years, double factor)
    {
        var request = Answers.WorkedExample with { LicenceYears = years };

        Assert.Equal((decimal)factor, Multiplier(request, "Driving experience"));
    }

    [Theory]
    [InlineData(0, "0 years with a full licence")]
    [InlineData(1, "1 year with a full licence")]
    [InlineData(2, "2 years with a full licence")]
    public void Driving_experience_says_year_for_one(int years, string detail)
    {
        var request = Answers.WorkedExample with { LicenceYears = years, NoClaimsYears = 0 };

        Assert.Equal(detail, RatingEngine.Rate(request).Line("Driving experience").Detail);
    }

    [Theory]
    [InlineData(0, "0 years, 0% off")]
    [InlineData(1, "1 year, 15% off")]
    [InlineData(2, "2 years, 25% off")]
    public void No_claims_bonus_says_year_for_one(int years, string detail)
    {
        var request = Answers.WorkedExample with { LicenceYears = 30, NoClaimsYears = years };

        Assert.Equal(detail, RatingEngine.Rate(request).Line("No-claims bonus").Detail);
    }

    [Theory]
    [InlineData(4999, 0.95)]
    [InlineData(5000, 1.0)]
    [InlineData(14999, 1.0)]
    [InlineData(15000, 1.1)]
    [InlineData(29999, 1.1)]
    [InlineData(30000, 1.2)]
    public void Car_value_bands(int value, double factor)
    {
        var request = Answers.WorkedExample with { CarValue = value };

        Assert.Equal((decimal)factor, Multiplier(request, "Car value"));
    }

    [Theory]
    [InlineData(9, 0.35)]
    [InlineData(10, 0.35)]
    [InlineData(25, 0.35)]
    public void No_claims_years_above_nine_count_as_nine(int years, double factor)
    {
        var request = Answers.WorkedExample with { LicenceYears = 30, NoClaimsYears = years };

        Assert.Equal((decimal)factor, Multiplier(request, "No-claims bonus"));
        Assert.Equal($"{years} years, 65% off", RatingEngine.Rate(request).Line("No-claims bonus").Detail);
    }

    [Theory]
    [InlineData(0, 1.0)]
    [InlineData(1, 1.25)]
    [InlineData(2, 1.6)]
    public void Claims_in_the_last_five_years(int claims, double factor)
    {
        var request = Answers.WorkedExample with { ClaimsLast5Years = claims };

        Assert.Equal((decimal)factor, Multiplier(request, "Claims in the last 5 years"));
    }

    [Fact]
    public void Third_party_only_skips_the_car_value_line_and_starts_higher()
    {
        var request = Answers.WorkedExample with { Cover = CoverLevel.ThirdPartyOnly };

        var quote = RatingEngine.Rate(request);

        Assert.DoesNotContain(quote.Lines, l => l.Label == "Car value");
        Assert.Equal(460.00m, quote.Lines[0].Amount);
        Assert.Equal("Third party only", quote.Lines[0].Detail);
    }

    [Theory]
    [InlineData(CoverLevel.Comprehensive, 400.00)]
    [InlineData(CoverLevel.ThirdPartyFireAndTheft, 430.00)]
    [InlineData(CoverLevel.ThirdPartyOnly, 460.00)]
    public void Each_level_of_cover_has_its_own_starting_price(CoverLevel cover, double price)
    {
        var quote = RatingEngine.Rate(Answers.WorkedExample with { Cover = cover });

        Assert.Equal((decimal)price, quote.Lines[0].RunningTotal);
    }

    [Theory]
    [InlineData(24, 500)]
    [InlineData(25, 250)]
    public void Compulsory_excess_is_500_under_25(int age, int excess)
    {
        var request = AgedOnBirthday(age) with { LicenceYears = 0, NoClaimsYears = 0 };

        Assert.Equal(excess, RatingEngine.Rate(request).CompulsoryExcess);
    }

    [Fact]
    public void Both_add_ons_are_priced_and_listed_in_order()
    {
        var quote = RatingEngine.Rate(Answers.WorkedExample with { Breakdown = true, LegalExpenses = true });

        var names = quote.Lines.Select(l => l.Label).ToList();
        Assert.Equal(45.00m, quote.Line("Breakdown cover").Amount);
        Assert.Equal(25.00m, quote.Line("Legal expenses cover").Amount);
        Assert.True(names.IndexOf("Breakdown cover") < names.IndexOf("Legal expenses cover"));
        Assert.Equal("Insurance Premium Tax", names[^1]);
    }

    [Fact]
    public void An_unknown_car_is_refused()
    {
        Assert.Throws<ArgumentException>(() => RatingEngine.Rate(Answers.WorkedExample with { VehicleId = "no-such-car" }));
    }
}
