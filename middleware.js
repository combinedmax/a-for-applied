import { NextResponse } from "next/server";

export function middleware(req) {
	const allowedReferer = "https://syzygy.lk";
	const requestReferer = req.headers.get("referer");

	console.log("Request Referer:", requestReferer); // Debugging log

	// Block if no referer (user typed URL manually) or referer is not syzygy.lk
	if (!requestReferer || !requestReferer.startsWith(allowedReferer)) {
		return new NextResponse("Access Denied", { status: 403 });
	}

	return NextResponse.next();
}

export const config = {
	matcher: "/(.*)", // Apply middleware to all routes
};
