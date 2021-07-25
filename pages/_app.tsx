import { AppProps } from "next/app";
import Head from "next/head";
import React from "react";

import "~/assets/style/global.css";

const App = ({ Component, pageProps }: AppProps) => (
  <>
    <Head>
      <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      <title>Prismaliser</title>
      <meta name="description" content="Visualise your Prisma schema!" />
      {/* OpenGraph */}
      <meta property="og:type" content="object" />
      <meta property="og:site_name" content="Prismaliser" />
      <meta property="og:title" content="Prismaliser" />
      <meta property="og:description" content="Visualise your Prisma schema!" />
      <meta property="og:image" content="/img/banner.png" />
      <meta property="og:image:width" content="1000" />
      <meta property="og:image:height" content="500" />
      <meta
        property="og:image:alt"
        content="Visualise your Prisma schema - Prismaliser"
      />
      {/* Other social media */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:creator" content="@ovyerus" />
      <meta property="twitter:title" content="Prismaliser" />
      <meta
        property="twitter:description"
        content="Visualise your Prisma schema!"
      />
      <meta property="twitter:image" content="/img/banner.png" />
      <meta
        property="twitter:image:alt"
        content="Visualise your Prisma schema - Prismaliser"
      />
    </Head>
    <Component {...pageProps} />
  </>
);

export default App;
