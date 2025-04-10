// [guid] - Copy.js
import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import "plyr/dist/plyr.css";
import Hls from "hls.js";

export default function VideoPage() {
	const router = useRouter();
	const { guid } = router.query;
	const [video, setVideo] = useState(null);
	const [currentQuality, setCurrentQuality] = useState(null);
	const videoRef = useRef(null);
	const playerRef = useRef(null);
	const hlsRef = useRef(null);

	// Fetch video details based on GUID
	useEffect(() => {
		if (guid && router.query.sectionId) {
			fetch(`/api/videos/${router.query.sectionId}/${guid}`)
				.then((res) => res.json())
				.then((data) => {
					console.log("Fetched video data:", data);
					setVideo(data);
					// Set default quality
					if (data.securedUrls?.length) {
						const defaultQuality =
							data.securedUrls.find(
								(url) => url.quality === data.defaultQuality
							) || data.securedUrls[0];
						setCurrentQuality(defaultQuality);
					}
				})
				.catch((error) => {
					console.error("Error fetching video data:", error);
				});
		}
	}, [guid, router.query.sectionId]);

	// Initialize Plyr and load HLS stream
	useEffect(() => {
		if (
			typeof window !== "undefined" &&
			video &&
			currentQuality &&
			videoRef.current
		) {
			import("plyr")
				.then((module) => {
					const Plyr = module.default;

					// Initialize Plyr with quality options
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
							quality: {
								default: currentQuality.height,
								options: video.securedUrls.map(
									(url) => url.height
								),
								forced: true,
								onChange: (quality) => {
									const selected = video.securedUrls.find(
										(url) => url.height === quality
									);
									if (selected) {
										setCurrentQuality(selected);
									}
								},
							},
						});
					}

					// Load HLS stream
					const loadHlsStream = () => {
						if (Hls.isSupported()) {
							if (hlsRef.current) {
								hlsRef.current.destroy();
							}

							const hls = new Hls();
							hlsRef.current = hls;

							hls.loadSource(currentQuality.url);
							hls.attachMedia(videoRef.current);

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
							videoRef.current.src = currentQuality.url;
						} else {
							console.error(
								"HLS is not supported in this browser."
							);
							alert(
								"Your browser does not support this video format."
							);
						}
					};

					loadHlsStream();
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
	}, [video, currentQuality]);

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

			{/* Manual quality selector (fallback) */}
			{video.securedUrls?.length > 1 && (
				<div style={{ marginTop: "10px" }}>
					<select
						value={currentQuality?.quality}
						onChange={(e) => {
							const selected = video.securedUrls.find(
								(url) => url.quality === e.target.value
							);
							if (selected) setCurrentQuality(selected);
						}}
						style={{
							padding: "8px",
							borderRadius: "4px",
							backgroundColor: "#333",
							color: "white",
							border: "1px solid #555",
						}}
					>
						{video.securedUrls.map((url) => (
							<option key={url.quality} value={url.quality}>
								{url.quality}
							</option>
						))}
					</select>
				</div>
			)}

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
