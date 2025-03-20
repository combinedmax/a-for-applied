import { NextResponse } from "next/server";

export function middleware(req) {
	const allowedOrigin = "https://syzygy.lk";
	const requestOrigin =
		req.headers.get("referer") || req.headers.get("origin");

	if (!requestOrigin || !requestOrigin.startsWith(allowedOrigin)) {
		return new NextResponse("Access Denied", { status: 403 });
	}

	return NextResponse.next();
}

export const config = {
	matcher: "/:path*", // Apply middleware to all routes
};
