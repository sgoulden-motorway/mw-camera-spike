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
  const [extractedText, setExtractedText] = useState("");
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
      const extracted = await extractText(dataUrl, Tesseract.default);
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

  return (
    <>
      <div className="relative flex h-[500px]">
        <video
          ref={viewfinderRef}
          className="absolute left-0 top-0"
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
          className="absolute left-0 top-0 z-10"
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
        {!visibleImage && (
          <button
            className="fixed bottom-0 z-50 mt-8 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            onClick={() => captureImage(true)}
          >
            Capture
          </button>
        )}
      </div>

      {visibleImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="relative m-4 w-full rounded-lg bg-white p-8 sm:m-8 sm:w-auto sm:p-16">
            <img
              className="camera-viewfinder__image mb-8"
              src={visibleImage}
              alt="Captured"
            />
            {showExtractedText && (
              <div className="absolute left-0 top-0 bg-white">
                <span>{extractedText}</span>
              </div>
            )}
            <div className="flex justify-center">
              {/* medium text centered with tailwind */}
              <p className="text-md">
                Check the image quality - does it look blurry? If so please
                press close and take another photo
              </p>
            </div>
            <div className="flex justify-between">
              <button
                className="rounded bg-red-500 px-4 py-2 font-bold text-white hover:bg-red-700"
                onClick={() => setVisibleImage(null)}
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
