using Aspire.Hosting.ApplicationModel;

var builder = DistributedApplication.CreateBuilder(args);

var sqlServer = builder.AddSqlServer("sqlserver")
    .WithLifetime(ContainerLifetime.Persistent);
var database = sqlServer.AddDatabase("mediacore");
var kafka = builder.AddKafka("kafka")
    .WithLifetime(ContainerLifetime.Persistent);
var clickhouse = builder.AddClickHouse("clickhouse")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent);
var analyticsDatabase = clickhouse.AddDatabase("mediacore-analytics");
var seq = builder.AddSeq("seq")
    .WithDataVolume()
    .WithLifetime(ContainerLifetime.Persistent)
    .WithEnvironment("ACCEPT_EULA", "Y");

builder.AddProject<Projects.MediaCore_Admin_Api>("admin-api")
    .WithReference(database)
    .WithReference(kafka)
    .WithReference(analyticsDatabase)
    .WithReference(seq)
    .WaitFor(database)
    .WaitFor(kafka)
    .WaitFor(analyticsDatabase)
    .WaitFor(seq);

builder.AddProject<Projects.MediaCore_Content_Api>("content-api")
    .WithReference(database)
    .WithReference(kafka)
    .WithReference(analyticsDatabase)
    .WithReference(seq)
    .WaitFor(database)
    .WaitFor(kafka)
    .WaitFor(analyticsDatabase)
    .WaitFor(seq);

builder.AddProject<Projects.MediaCore_Worker>("worker")
    .WithReference(database)
    .WithReference(kafka)
    .WithReference(analyticsDatabase)
    .WithReference(seq)
    .WaitFor(database)
    .WaitFor(kafka)
    .WaitFor(analyticsDatabase)
    .WaitFor(seq);

builder.Build().Run();
