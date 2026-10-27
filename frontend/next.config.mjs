/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@princess-brothers/ui", "@princess-brothers/db"],
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "princesbrothers.com" }],
        destination: "https://www.princesbrothers.com/:path*",
        statusCode: 301
      }
    ];
  }
};

export default nextConfig;