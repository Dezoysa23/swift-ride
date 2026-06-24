let isLoading = false;
let isLoaded = false;

interface LoadGoogleMapsOptions {
  onLoad?: () => void;
}

export function loadGoogleMapsAPI({ onLoad }: LoadGoogleMapsOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (isLoaded && window.google) {
      onLoad?.();
      resolve();
      return;
    }

    // If currently loading, wait for it
    if (isLoading) {
      const checkLoaded = setInterval(() => {
        if (isLoaded && window.google) {
          clearInterval(checkLoaded);
          onLoad?.();
          resolve();
        }
      }, 100);
      return;
    }

    // Start loading
    isLoading = true;

    // Verify API key is present
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      isLoading = false;
      const error = new Error('Google Maps API key is missing');
      console.error(error);
      reject(error);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoaded = true;
      isLoading = false;
      onLoad?.();
      resolve();
    };

    script.onerror = (error) => {
      console.error('Failed to load Google Maps script:', error);
      isLoading = false;
      reject(error);
    };

    document.head.appendChild(script);
  });
}
