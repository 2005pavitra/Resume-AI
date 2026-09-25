export const registerGatewayRoutes = (app, routes) => {
    app.use("/api/auth", routes.auth);
    app.use("/api/resumes", routes.resumes);
    app.use("/api/jobs", routes.jobs);
    app.use("/api/analysis", routes.analysis);
    app.use("/api/profiles", routes.profiles);
};
