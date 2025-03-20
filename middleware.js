import { NextResponse } from "next/server";

export function middleware(req) {
	const allowedReferer = "syzygy.lk";
	const requestReferer = req.headers.get("referer");

	console.log("Request Referer:", requestReferer); // Debugging log

	// Allow assets (JS, CSS, Images) to load
	const assetExtensions = [
		".js",
		".css",
		".png",
		".jpg",
		".jpeg",
		".gif",
		".svg",
		".ico",
	];
	if (assetExtensions.some((ext) => req.nextUrl.pathname.endsWith(ext))) {
		return NextResponse.next();
	}

	// Block if no referer (user typed URL manually) or referer does not contain syzygy.lk
	if (!requestReferer || !requestReferer.includes(allowedReferer)) {
		return new NextResponse("Access Denied", { status: 403 });
	}

	return NextResponse.next();
}

export const config = {
	matcher: "/(.*)", // Apply middleware to all routes
};
