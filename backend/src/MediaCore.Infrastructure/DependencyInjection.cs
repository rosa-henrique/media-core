using Aspire.ClickHouse.Driver;

using Microsoft.Extensions.Hosting;

namespace MediaCore.Infrastructure;

public static class DependencyInjection
{
    public static IHostApplicationBuilder AddInfrastructure(this IHostApplicationBuilder builder)
    {
        builder.AddClickHouseDataSource("mediacore-analytics");
        return builder;
    }
}
