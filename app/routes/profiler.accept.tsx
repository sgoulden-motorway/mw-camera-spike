import React, { useCallback, useEffect, useRef, useState } from "react";

import { LoaderArgs, json, redirect } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
const bucketName = "images-doc-recognition";

export async function action({ request }: LoaderArgs) {
  const { Storage } = require("@google-cloud/storage");
  console.log("fs");

  // const url = new URL(request.url);
  // return json(await searchCities(url.searchParams.get("q")));
  const storage = new Storage({
    projectId: "quick-line-389216",
  });
  const bucket = storage.bucket(bucketName);
  const saveImageToBucket = async (imageData, fileName) => {
    const file = bucket.file(fileName);

    // Convert imageData from base64 to binary
    const base64EncodedImageString = imageData.split(",")[1];
    const imageBuffer = Buffer.from(base64EncodedImageString, "base64");

    await file.save(imageBuffer, {
      contentType: "image/png", // Set the appropriate content type for your image
      resumable: false,
    });
  };
  const formData = await request.formData();
  const imageData = formData.get("imageData");
  const fileName = formData.get("fileName");

  await saveImageToBucket(imageData, fileName);
  // get the file from the bucket
  // get the url of the image in the bucket
  return redirect(`/profiler/accept`);
}

const CameraViewfinder = () => {
  const viewfinderRef = useRef(null);
  const overlayRef = useRef(null);
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [started, setStarted] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [sharpness, setSharpness] = useState(-1);
  const [shakiness, setShakiness] = useState(null);
  const resizeOverlayRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("getUserMedia is not supported");
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "environment",
        },
      })
      .then((stream) => {
        const viewfinderElement = viewfinderRef.current;

        viewfinderElement.srcObject = stream;
      })
      .catch((error) => {
        console.error("Error accessing camera:", error);
      });
  }, []);

  useEffect(() => {
    const viewfinderElement = viewfinderRef.current;
    const overlayElement = overlayRef.current;

    const resizeOverlay = () => {
      // Set the overlay's dimensions to match the viewfinder's size
      overlayElement.setAttribute("width", viewfinderElement.offsetWidth);
      overlayElement.setAttribute("height", viewfinderElement.offsetHeight);
    };

    resizeOverlay();
    resizeOverlayRef.current = resizeOverlay;
    window.addEventListener("resize", resizeOverlay);

    const handleMotion = (event: any) => {
      console.log(event);
      console.log(event.acceleration);
    };

    return () => {
      // Clean up the event listener on component unmount
      window.removeEventListener("resize", resizeOverlay);
    };
  }, []);

  const captureImage = async (show: boolean) => {
    const viewfinderElement = viewfinderRef.current;

    // Create a canvas element
    const canvas = document.createElement("canvas");
    canvas.width = viewfinderElement.videoWidth;
    canvas.height = viewfinderElement.videoHeight;

    // Draw the current frame of the viewfinder onto the canvas
    const context = canvas.getContext("2d");
    context.drawImage(viewfinderElement, 0, 0, canvas.width, canvas.height);

    // Convert the canvas image to a data URL
    const dataUrl = canvas.toDataURL("image/png");

    if (show) {
      setExtractedText("Extracted text loading...");
      setVisibleImage(dataUrl);
      const Tesseract = await import("tesseract.js");
      console.log(Tesseract);
      const [extracted, sharpness] = await Promise.all([
        extractText(dataUrl, Tesseract.default),
        checkSharpness(dataUrl, Tesseract.default),
      ]);
      setSharpness(sharpness);
      setExtractedText(extracted);
    }
  };

  const extractText = async (dataUrl: string, Tesseract: any) => {
    console.log("extracting text");
    const {
      data: { text },
    } = await Tesseract.recognize(dataUrl);

    return text;
  };

  const checkSharpness = async (dataUrl: string, Tesseract: any) => {
    console.log("checking sharpness");

    // create a base64 encoded image from the dataUrl
    const base64EncodedImageString = dataUrl.split(",")[1];
    try {
      const response = await fetch("http://localhost:9150/check-sharpness", {
        // add in a body of "buffer": base64EncodedImageString
        // add in a header of "Content-Type": "application/json"
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ buffer: base64EncodedImageString }),
        method: "POST",
      });

      const json = await response.json();

      return json.sharpness;
    } catch (error) {
      console.log(error);
    }
  };

  const requestPermissions = async () => {
    let alpha = 0,
      beta = 0,
      gamma = 0;
    const s = 0.25;
    const deviceMotionHandler = (event) => {
      console.log(event.rotationRate);
      // Obtain acceleration including gravity from event
      alpha = event.rotationRate.alpha + s * (alpha - event.rotationRate.alpha);
      beta = event.rotationRate.beta + s * (beta - event.rotationRate.beta);
      gamma = event.rotationRate.gamma + s * (gamma - event.rotationRate.gamma);
      console.log(alpha, beta, gamma);
    };
    // Checking for Device Motion Event support
    if (typeof DeviceMotionEvent.requestPermission === "function") {
      DeviceMotionEvent.requestPermission()
        .then((permissionState: string) => {
          if (permissionState === "granted") {
            window.addEventListener("devicemotion", deviceMotionHandler);
          } else {
            console.error("Device Motion permission not granted");
          }
        })
        .catch(console.error);
    } else {
      // Non iOS 13+ devices
      window.addEventListener("devicemotion", deviceMotionHandler);
    }
    setStarted(true);
  };

  return (
    <>
      <div className="relative flex h-[500px]">
        <video
          ref={viewfinderRef}
          className={`absolute left-0 top-0 ${started ? "" : "invisible"}`}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => {
            resizeOverlayRef.current();
          }}
        />
        <svg
          width="0"
          height="0"
          ref={overlayRef}
          className={`absolute left-0 top-0 z-10 ${started ? "" : "invisible"}`}
        >
          <rect
            x="5%"
            y="10%"
            width="90%"
            height="80%"
            rx="10"
            ry="10"
            fill="none"
            stroke="blue"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="flex flex-col justify-around">
        {/* create a nice button using tailwind that calls onClick={() => captureImage(true)} */}
        {!started && (
          <button
            className="absolute left-[50%] top-[50%] z-50 mt-8 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            onClick={() => requestPermissions()}
          >
            Start
          </button>
        )}
        {!visibleImage && (
          <button
            className="fixed bottom-0 z-50 mt-8 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            onClick={() => captureImage(true)}
          >
            "Capture"
          </button>
        )}
      </div>

      {visibleImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <div className="relative m-4 w-full rounded-lg bg-white p-8 sm:m-8 sm:w-auto sm:p-16">
            <img
              className="camera-viewfinder__image mb-8"
              src={visibleImage}
              alt="Captured"
            />
            <div>
              {/* medium text centered with tailwind */}
              {sharpness && (
                <div className="bg-white text-xs">
                  <span>
                    sharpness score:{" "}
                    {sharpness === -1 ? "Loading..." : sharpness}
                  </span>
                </div>
              )}
              {/* medium text centered with tailwind */}
              {showExtractedText && (
                <div className="left-0 top-0 bg-white text-xs">
                  <span>
                    Extracted text:
                    <br /> {extractedText}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between">
              <button
                className="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700"
                onClick={() => {
                  setShowExtractedText(false);
                  setSharpness(-1);
                  setVisibleImage(null);
                }}
              >
                Close
              </button>
              <button
                className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
                onClick={() => setShowExtractedText(!showExtractedText)}
              >
                Toggle Extracted Text
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CameraViewfinder;
