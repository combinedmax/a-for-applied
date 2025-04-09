import { NextResponse } from "next/server";

export function middleware(req) {
	const allowedReferer = [
		"syzygy.lk",
		"combinedmax.com",
		"cmax-vid.vercel.app",
	];
	const requestReferer = req.headers.get("referer");
	const host = req.headers.get("host");

	console.log("Request Referer:", requestReferer);
	console.log("Host:", host);

	// Allow assets (JS, CSS, Images, JSON) to load
	const assetExtensions = [
		".js",
		".css",
		".png",
		".jpg",
		".jpeg",
		".gif",
		".svg",
		".ico",
		".json",
	];
	if (assetExtensions.some((ext) => req.nextUrl.pathname.endsWith(ext))) {
		return NextResponse.next();
	}

	// Allow internal navigation within the app
	if (requestReferer && requestReferer.includes(host)) {
		return NextResponse.next();
	}

	// Block if no referer (user typed URL manually) or referer does not contain syzygy.lk
	if (
		!requestReferer ||
		!allowedReferer.some((domain) => requestReferer.includes(domain))
	) {
		return new NextResponse("Access Denied", { status: 403 });
	}

	return NextResponse.next();
}

export const config = {
	matcher: "/(.*)", // Apply middleware to all routes
};
