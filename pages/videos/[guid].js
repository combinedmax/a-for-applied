import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import "plyr/dist/plyr.css"; // Import Plyr styles
import Hls from "hls.js"; // Import hls.js for HLS support

export default function VideoPage() {
	const router = useRouter();
	const { guid } = router.query; // Get the video GUID from the URL
	const [video, setVideo] = useState(null);
	const videoRef = useRef(null);
	const playerRef = useRef(null);
	const hlsRef = useRef(null);

	// Fetch video details based on GUID
	useEffect(() => {
		if (guid && router.query.sectionId) {
			fetch(`/api/videos/${router.query.sectionId}/${guid}`) // Fetch video by sectionId and GUID
				.then((res) => res.json())
				.then((data) => {
					console.log("Fetched video data:", data);
					setVideo(data);
				})
				.catch((error) => {
					console.error("Error fetching video data:", error);
				});
		}
	}, [guid, router.query.sectionId]);

	// Initialize Plyr and HLS.js
	useEffect(() => {
		if (typeof window !== "undefined" && video && videoRef.current) {
			import("plyr")
				.then((module) => {
					const Plyr = module.default;

					// Initialize Plyr
					if (!playerRef.current) {
						playerRef.current = new Plyr(videoRef.current, {
							controls: [
								"play",
								"rewind",
								"fast-forward",
								"progress",
								"current-time",
								"mute",
								"volume",
								"settings",
								"fullscreen",
							],
							settings: ["quality", "speed", "loop"],
						});
					}

					// Load HLS.js if the browser doesn't support HLS natively
					if (Hls.isSupported()) {
						const hls = new Hls();
						hlsRef.current = hls;

						// Attach HLS.js to the video element
						hls.loadSource(video.securedUrl);
						hls.attachMedia(videoRef.current);

						// Handle HLS.js errors
						hls.on(Hls.Events.ERROR, (event, data) => {
							console.error("HLS.js error:", data);
							if (data.fatal) {
								switch (data.type) {
									case Hls.ErrorTypes.NETWORK_ERROR:
										console.error(
											"Fatal network error encountered, try to recover"
										);
										hls.startLoad();
										break;
									case Hls.ErrorTypes.MEDIA_ERROR:
										console.error(
											"Fatal media error encountered, try to recover"
										);
										hls.recoverMediaError();
										break;
									default:
										console.error(
											"Fatal error encountered, cannot recover"
										);
										hls.destroy();
										break;
								}
							}
						});
					} else if (
						videoRef.current.canPlayType(
							"application/vnd.apple.mpegurl"
						)
					) {
						// Native HLS support (e.g., Safari)
						videoRef.current.src = video.securedUrl;
					} else {
						console.error("HLS is not supported in this browser.");
						alert(
							"Your browser does not support this video format."
						);
					}
				})
				.catch((error) => {
					console.error("Error loading Plyr:", error);
				});
		}

		// Cleanup function
		return () => {
			if (hlsRef.current) {
				hlsRef.current.destroy();
				hlsRef.current = null;
			}
			if (playerRef.current) {
				playerRef.current.destroy();
				playerRef.current = null;
			}
		};
	}, [video]);

	if (!video) {
		return <div>Loading...</div>;
	}

	return (
		<div
			style={{
				textAlign: "center",
				padding: "20px",
				color: "white",
				background: "black",
			}}
		>
			<h1 style={{ marginBottom: "10px" }}>{video.title}</h1>

			{/* Video Player */}
			<div style={{ maxWidth: "800px", margin: "auto" }}>
				<video ref={videoRef} className="plyr" controls />
			</div>

			{/* Back Button */}
			<div style={{ marginTop: "20px" }}>
				<button
					onClick={() =>
						router.push(`/sections/${router.query.sectionId}`)
					}
					style={{
						background: "#ffcc00",
						color: "black",
						padding: "10px 20px",
						border: "none",
						borderRadius: "5px",
						cursor: "pointer",
						fontWeight: "bold",
					}}
				>
					Back to Video List
				</button>
			</div>
		</div>
	);
}
