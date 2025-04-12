import { useRouter } from "next/router";
import { useEffect, useState, useRef } from "react";
import "plyr/dist/plyr.css";
import Hls from "hls.js";

export default function VideoPage() {
  const router = useRouter();
  const { guid } = router.query;
  const [video, setVideo] = useState(null);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  // Fetch video details based on GUID
  useEffect(() => {
    if (guid && router.query.sectionId) {
      setIsLoading(true);
      setError(null);

      fetch(`/api/videos/${router.query.sectionId}/${guid}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch video data");
          return res.json();
        })
        .then((data) => {
          if (!data.securedUrls?.length) {
            throw new Error("No available resolutions found");
          }

          setVideo(data);
          // Set default quality
          const defaultQuality =
            data.securedUrls.find(
              (url) => url.quality === data.defaultQuality
            ) || data.securedUrls[0];
          setCurrentQuality(defaultQuality);
        })
        .catch((error) => {
          console.error("Error fetching video data:", error);
          setError(error.message);
        })
        .finally(() => setIsLoading(false));
    }
  }, [guid, router.query.sectionId]);

  // Fallback to 360p if 720p fails to load
  const attemptFallback = () => {
    if (!video || !video.securedUrls) return;

    // Find 360p quality
    const lowerQuality = video.securedUrls.find(
      (url) => url.quality === "360p"
    );

    if (lowerQuality && currentQuality?.quality === "720p") {
      console.log("Falling back to 360p due to timeout");
      setCurrentQuality(lowerQuality);
    }
  };

  // Load HLS stream with timeout fallback
  const loadHlsStream = (url, quality) => {
    setIsLoading(true);
    setError(null);

    // Clear any existing timer
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }

    // Set fallback timer for 720p
    if (quality === "720p") {
      fallbackTimerRef.current = setTimeout(() => {
        if (isLoading) {
          attemptFallback();
        }
      }, 5000); // 5 second timeout
    }

    // Destroy previous HLS instance
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
        clearTimeout(fallbackTimerRef.current);
        setIsLoading(false);
        if (playerRef.current) {
          playerRef.current
            .play()
            .catch((e) => console.log("Auto-play prevented:", e));
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS.js error:", data);
        clearTimeout(fallbackTimerRef.current);

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                data.response?.code === 404
              ) {
                attemptFallback();
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              attemptFallback();
              break;
          }
        }
      });
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (e.g., Safari)
      videoRef.current.src = url;
      videoRef.current.addEventListener("loadedmetadata", () => {
        clearTimeout(fallbackTimerRef.current);
        setIsLoading(false);
        videoRef.current
          .play()
          .catch((e) => console.log("Auto-play prevented:", e));
      });
      videoRef.current.addEventListener("error", () => {
        clearTimeout(fallbackTimerRef.current);
        attemptFallback();
      });
    } else {
      setError("Your browser does not support this video format.");
      setIsLoading(false);
    }
  };

  // Initialize Plyr and load initial stream
  useEffect(() => {
    if (!video || !currentQuality || !videoRef.current) return;

    let plyr;
    import("plyr")
      .then((module) => {
        const Plyr = module.default;

        // Initialize Plyr
        if (!playerRef.current) {
          plyr = new Plyr(videoRef.current, {
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
                if (selected) {
                  setCurrentQuality(selected);
                }
              },
            },
          });
          playerRef.current = plyr;
        }

        loadHlsStream(currentQuality.url, currentQuality.quality);
      })
      .catch((error) => {
        console.error("Error loading Plyr:", error);
        setIsLoading(false);
      });

    return () => {
      if (plyr) {
        plyr.destroy();
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [video]);

  // Handle quality changes
  useEffect(() => {
    if (currentQuality && videoRef.current) {
      loadHlsStream(currentQuality.url, currentQuality.quality);
    }
  }, [currentQuality]);

  if (!video) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "20px",
          color: "white",
          background: "black",
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {error ? (
          <div>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#ffcc00",
                color: "black",
                padding: "10px 20px",
                marginTop: "10px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        ) : (
          <div>Loading video data...</div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        textAlign: "center",
        padding: "20px",
        color: "white",
        background: "black",
        position: "relative",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>{video.title}</h1>

      {/* Error message */}
      {error && (
        <div
          style={{
            padding: "15px",
            background: "#ff3333",
            color: "white",
            borderRadius: "5px",
            marginBottom: "20px",
            maxWidth: "800px",
            margin: "0 auto 20px",
          }}
        >
          {error}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            flexDirection: "column",
          }}
        >
          <div>Loading {currentQuality?.quality} resolution...</div>
          {currentQuality?.quality === "720p" && (
            <div style={{ marginTop: "10px", fontSize: "0.9em" }}>
              Will automatically switch to 360p if this takes too long
            </div>
          )}
        </div>
      )}

      {/* Video Player */}
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          position: "relative",
        }}
      >
        <video
          ref={videoRef}
          className="plyr"
          controls
          style={{ width: "100%", background: "#000" }}
          playsInline
        />
      </div>

      {/* Back Button */}
      <div style={{ marginTop: "30px" }}>
        <button
          onClick={() => router.push(`/sections/${router.query.sectionId}`)}
          style={{
            background: "#ffcc00",
            color: "black",
            padding: "12px 24px",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "1em",
          }}
          disabled={isLoading}
        >
          Back to Video List
        </button>
      </div>
    </div>
  );
}
