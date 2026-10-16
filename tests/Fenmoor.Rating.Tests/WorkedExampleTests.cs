namespace Fenmoor.Rating.Tests;

public class WorkedExampleTests
{
    // Worked out apart from the engine, in Python Decimal, line for line with 5-quote.png.
    private static readonly (string Label, decimal Amount, decimal RunningTotal)[] Expected =
    [
        ("Starting price", 400.00m, 400.00m),
        ("Your age", 0.00m, 400.00m),
        ("Driving experience", 0.00m, 400.00m),
        ("Your car", 16.00m, 416.00m),
        ("Car value", 0.00m, 416.00m),
        ("Where you live", -62.40m, 353.60m),
        ("Where it is kept overnight", 0.00m, 353.60m),
        ("Annual mileage", 0.00m, 353.60m),
        ("What the car is used for", 0.00m, 353.60m),
        ("Claims in the last 5 years", 0.00m, 353.60m),
        ("No-claims bonus", -183.87m, 169.73m),
        ("Voluntary excess", -11.88m, 157.85m),
        ("Breakdown cover", 45.00m, 202.85m),
        ("Insurance Premium Tax", 24.34m, 227.19m),
    ];

    [Fact]
    public void Every_line_amount_and_running_total_is_as_worked_out()
    {
        var quote = RatingEngine.Rate(Answers.WorkedExample);

        Assert.Equal(Expected.Select(e => e.Label), quote.Lines.Select(l => l.Label));
        Assert.Equal(Expected.Select(e => e.Amount), quote.Lines.Select(l => l.Amount));
        Assert.Equal(Expected.Select(e => e.RunningTotal), quote.Lines.Select(l => l.RunningTotal));
    }

    [Fact]
    public void The_year_costs_227_19_and_the_month_20_45()
    {
        var quote = RatingEngine.Rate(Answers.WorkedExample);

        Assert.Equal(227.19m, quote.Annual);
        Assert.Equal(20.45m, quote.Monthly);
    }

    [Fact]
    public void The_excess_is_250_compulsory_and_250_voluntary()
    {
        var quote = RatingEngine.Rate(Answers.WorkedExample);

        Assert.Equal(250, quote.CompulsoryExcess);
        Assert.Equal(250, quote.VoluntaryExcess);
    }

    [Fact]
    public void The_lines_add_up_exactly()
    {
        var quote = RatingEngine.Rate(Answers.WorkedExample);

        Assert.Equal(quote.Annual, quote.Lines.Sum(l => l.Amount));
    }

    [Fact]
    public void The_working_reads_as_the_prototype_does()
    {
        var quote = RatingEngine.Rate(Answers.WorkedExample);

        Assert.Equal("Comprehensive", quote.Line("Starting price").Detail);
        Assert.Equal("42 on the start date", quote.Line("Your age").Detail);
        Assert.Equal("20 years with a full licence", quote.Line("Driving experience").Detail);
        Assert.Equal("Insurance group 17", quote.Line("Your car").Detail);
        Assert.Equal("£14,500", quote.Line("Car value").Detail);
        Assert.Equal("PE postcode area, band A", quote.Line("Where you live").Detail);
        Assert.Equal("Driveway", quote.Line("Where it is kept overnight").Detail);
        Assert.Equal("5,000 to 10,000 miles", quote.Line("Annual mileage").Detail);
        Assert.Equal("Social and commuting", quote.Line("What the car is used for").Detail);
        Assert.Equal("0", quote.Line("Claims in the last 5 years").Detail);
        Assert.Equal("6 years, 52% off", quote.Line("No-claims bonus").Detail);
        Assert.Equal("£250", quote.Line("Voluntary excess").Detail);
        Assert.Equal("12% on everything above", quote.Line("Insurance Premium Tax").Detail);
    }
}
