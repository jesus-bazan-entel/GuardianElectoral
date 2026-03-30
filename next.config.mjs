import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  skipWaiting: true,
  fallbacks: {
    document: "/offline",
  },
});

const nextConfig = {
  output: "standalone" ,
  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);
