namespace Fenmoor.Rating;

internal static class Money
{
    /// <summary>
    /// Rounds to the penny, half away from zero. Without a mode <see cref="decimal.Round(decimal, int)"/>
    /// rounds half to even, which is not what the rating contract says.
    /// </summary>
    /// <remarks>
    /// Adding <c>0.00m</c> gives the result two decimal places however it was reached, so the
    /// penny is written the same way on the wire every time: 400.00, never 400 or 400.0.
    /// </remarks>
    public static decimal Round(decimal amount) => decimal.Round(amount, 2, MidpointRounding.AwayFromZero) + 0.00m;
}
