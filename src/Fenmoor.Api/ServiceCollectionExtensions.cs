using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Fenmoor.Api;

public static class ServiceCollectionExtensions
{
    /// <summary>Everything the functions need, and the JSON settings the results are written with.</summary>
    public static IServiceCollection AddFenmoorApi(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.TryAddSingleton(TimeProvider.System);
        services.TryAddSingleton<IReferenceGenerator, RandomReferenceGenerator>();
        services.Configure<JsonOptions>(options => ApiJson.Configure(options.JsonSerializerOptions));
        return services;
    }
}
