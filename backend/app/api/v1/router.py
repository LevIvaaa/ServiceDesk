from fastapi import APIRouter

from app.api.v1 import auth, users, departments, roles, operators, stations, tickets, knowledge_base, dashboard, notifications, log_analysis

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(roles.router, prefix="/roles", tags=["Roles"])
api_router.include_router(operators.router, prefix="/operators", tags=["Operators"])
api_router.include_router(stations.router, prefix="/stations", tags=["Stations"])
api_router.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
api_router.include_router(knowledge_base.router, prefix="/knowledge", tags=["Knowledge Base"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(log_analysis.router, prefix="/log-analysis", tags=["Log Analysis"])
