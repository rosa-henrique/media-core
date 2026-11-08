using MediaCore.Infrastructure;

var builder = Host.CreateApplicationBuilder(args);
builder.AddServiceDefaults();
builder.AddInfrastructure();
builder.AddSeqEndpoint("seq");

var host = builder.Build();
host.Run();
