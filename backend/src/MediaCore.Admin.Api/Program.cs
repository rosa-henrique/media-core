using MediaCore.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.AddServiceDefaults();
builder.AddInfrastructure();
builder.AddSeqEndpoint("seq");

var app = builder.Build();
app.MapDefaultEndpoints();

app.Run();
