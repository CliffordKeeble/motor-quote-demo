namespace Fenmoor.Api;

/// <summary>
/// "Today" for the customer. Functions run on UTC and the customer is in the UK, so for an hour
/// after midnight in summer the two dates differ.
/// </summary>
public static class LondonTime
{
    // The IANA id on Linux and macOS (and on Windows with ICU), the Windows id otherwise.
    private static readonly TimeZoneInfo London = Find("Europe/London", "GMT Standard Time");

    public static DateOnly Today(TimeProvider clock)
    {
        ArgumentNullException.ThrowIfNull(clock);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), London).DateTime);
    }

    private static TimeZoneInfo Find(string iana, string windows)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(iana);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById(windows);
        }
    }
}
