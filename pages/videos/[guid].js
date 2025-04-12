import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import "plyr/dist/plyr.css";
import Hls from "hls.js";

export default function VideoPage() {
  const router = useRouter();
  const { guid } = router.query;
  const [video, setVideo] = useState(null);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start in loading state
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);

  // Fetch video details
  useEffect(() => {
    if (guid && router.query.sectionId) {
      fetch(`/api/videos/${router.query.sectionId}/${guid}`)
        .then((res) => res.json())
        .then((data) => {
          setVideo(data);
          // Find 360p quality or fallback to first available
          const defaultQuality =
            data.securedUrls.find(
              (url) => url.quality === data.defaultQuality
            ) || data.securedUrls[0];
          setCurrentQuality(defaultQuality);
        })
        .catch(console.error);
    }
  }, [guid, router.query.sectionId]);

  // Load HLS stream with error recovery
  const loadHlsStream = (url) => {
    setIsLoading(true);

    // Cleanup previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferHole: 1.0,
        lowLatencyMode: false,
      });
      hlsRef.current = hls;

      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              handleStreamError();
              break;
          }
        }
      });
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.current.src = url;
      videoRef.current.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
      });
    } else {
      alert("Browser not supported");
      setIsLoading(false);
    }
  };

  // Handle stream errors
  const handleStreamError = () => {
    if (!video || !video.securedUrls) return;

    // Try lower quality if available
    const currentIndex = video.securedUrls.findIndex(
      (url) => url.quality === currentQuality.quality
    );

    if (currentIndex > 0) {
      const lowerQuality = video.securedUrls[currentIndex - 1];
      setCurrentQuality(lowerQuality);
    } else {
      setIsLoading(false);
      alert("Failed to load video");
    }
  };

  // Initialize player
  useEffect(() => {
    if (!video || !currentQuality || !videoRef.current) return;

    import("plyr").then((Plyr) => {
      if (!playerRef.current) {
        playerRef.current = new Plyr.default(videoRef.current, {
          controls: [
            "play",
            "progress",
            "current-time",
            "mute",
            "volume",
            "settings",
            "fullscreen",
          ],
          settings: ["quality", "speed"],
          quality: {
            default: currentQuality.height,
            options: video.securedUrls.map((url) => url.height),
            forced: true,
            onChange: (quality) => {
              const selected = video.securedUrls.find(
                (url) => url.height === quality
              );
              if (selected) setCurrentQuality(selected);
            },
          },
        });
      }

      loadHlsStream(currentQuality.url);
    });

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
      if (playerRef.current) playerRef.current.destroy();
    };
  }, [video]);

  // Handle quality changes
  useEffect(() => {
    if (currentQuality && videoRef.current) {
      loadHlsStream(currentQuality.url);
    }
  }, [currentQuality]);

  if (!video) return <div>Loading video info...</div>;

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "20px",
        position: "relative",
      }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            zIndex: 10,
          }}
        >
          <div>Loading {currentQuality?.quality}...</div>
          <div style={{ marginTop: "10px", fontSize: "0.8em" }}>
            {currentQuality?.quality === "720p" && (
              <button
                onClick={() => {
                  const lowerQuality = video.securedUrls.find(
                    (url) => url.quality === "360p"
                  );
                  if (lowerQuality) setCurrentQuality(lowerQuality);
                }}
                style={{
                  padding: "5px 10px",
                  background: "#ffcc00",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Switch to 360p (faster loading)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Video player */}
      <h1 style={{ marginBottom: "20px" }}>{video.title}</h1>
      <video
        ref={videoRef}
        style={{ width: "100%", background: "#000" }}
        controls
      />

      {/* Quality selector */}
      <div style={{ marginTop: "15px" }}>
        <select
          value={currentQuality?.quality}
          onChange={(e) => {
            const selected = video.securedUrls.find(
              (url) => url.quality === e.target.value
            );
            if (selected) setCurrentQuality(selected);
          }}
          disabled={isLoading}
          style={{
            padding: "8px 12px",
            background: "#333",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          {video.securedUrls.map((res) => (
            <option key={res.quality} value={res.quality}>
              {res.quality}
            </option>
          ))}
        </select>
      </div>

      {/* Back button */}
      <div style={{ marginTop: "20px" }}>
        <button
          onClick={() => router.push(`/sections/${router.query.sectionId}`)}
          style={{
            padding: "10px 20px",
            background: "#ffcc00",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Back to Video List
        </button>
      </div>
    </div>
  );
}
