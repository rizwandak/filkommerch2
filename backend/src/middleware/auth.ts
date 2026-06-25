import { Request, Response, NextFunction } from "express";

export const checkRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.header("x-user-role");

    if (!userRole) {
      return res.status(401).json({
        success: false,
        error: "Akses ditolak: Header x-user-role tidak ditemukan.",
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Akses ditolak: Peran '${userRole}' tidak diizinkan untuk rute ini.`,
      });
    }

    next();
  };
};
