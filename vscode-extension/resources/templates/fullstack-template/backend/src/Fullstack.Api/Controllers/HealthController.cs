namespace Fullstack.Api.Controllers;

public static class HealthController
{
    public static object Get() => new { status = "ok" };
}
