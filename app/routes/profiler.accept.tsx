import React, { useCallback, useEffect, useRef, useState } from "react";

import Tesseract from "tesseract.js";
import { LoaderArgs, json, redirect } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import fs from "fs";
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

    console.log(imageBuffer);

    await file.save(imageBuffer, {
      contentType: "image/png", // Set the appropriate content type for your image
      resumable: false,
    });

    console.log(`Image ${fileName} saved to bucket ${bucketName}`);
  };
  const formData = await request.formData();
  const imageData = formData.get("imageData");
  const fileName = formData.get("fileName");

  await saveImageToBucket(imageData, fileName);
  // get the file from the bucket
  // get the url of the image in the bucket
  return redirect(`/profiler/accept`);
}

const cameraViewfinderClasses = "relative h-[500px] flex";

const cameraViewfinderVideoClasses = "absolute top-0 left-0";

const cameraViewfinderOverlayClasses = "absolute top-0 left-0 z-10";

const CameraViewfinder = () => {
  const viewfinderRef = useRef(null);
  const overlayRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const resizeOverlayRef = useRef(null);

  const fetcher = useFetcher();
  console.log(capturedImage);
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

  // add a set timeout in a useeffect to call extract text every 2 seconds
  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     captureImage();
  //   }, 2000);
  //   return () => clearInterval(interval);
  // }, []);

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
    console.log("capturing image");
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

    setCapturedImage(dataUrl);

    const fileNameWithDate = `test/img-${Date.now()}.png`;
    const text = await extractText(dataUrl);
    setExtractedText(text);
    if (show) {
      setVisibleImage(dataUrl);
      try {
        setLoading(true);
        const imageUrl = await fetcher.submit(
          { imageData: dataUrl, fileName: fileNameWithDate },
          { method: "post" }
        );

        setLoading(false);
      } catch (error) {
        console.log(error);
        setLoading(false);
      }
    }
  };

  const imageRef = useRef(null);

  const extractText = async (dataUrl: string) => {
    const imageElement = imageRef.current;

    // Load the image and perform OCR
    const {
      data: { text },
    } = await Tesseract.recognize(dataUrl);

    return text;
  };

  const reloadSrc = (e) => {
    console.log("reloading", e);
    if (fallback) {
      e.target.src = "";
    } else {
      e.target.src = capturedImage;
      setFallback(true);
    }
  };

  return (
    <>
      <>
        <div className={cameraViewfinderClasses}>
          <video
            ref={viewfinderRef}
            className={cameraViewfinderVideoClasses}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              resizeOverlayRef.current();
            }}
          />
          {/* add some nice big text stating the extractedText with a highlighted background */}
          {extractedText && (
            <span className="z-10 text-2xl">{extractedText}</span>
          )}
          <svg
            width="0"
            height="0"
            ref={overlayRef}
            className={cameraViewfinderOverlayClasses}
          >
            <rect
              x="10%"
              y="10%"
              width="85%"
              height="85%"
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
          <button
            className="fixed bottom-0 z-50 mt-8 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
            onClick={() => captureImage(true)}
          >
            Capture
          </button>
        </div>
        <div className="flex justify-center">
          <span>{extractedText}</span>
        </div>
        {visibleImage && (
          <img
            className="camera-viewfinder__image"
            src={visibleImage}
            alt="Captured"
            onError={reloadSrc}
          />
        )}
      </>
    </>
  );
};

export default CameraViewfinder;
