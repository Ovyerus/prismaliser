import { AppProps } from "next/app";
import Head from "next/head";
import React from "react";

import "~/assets/style/global.css";

const App = ({ Component, pageProps }: AppProps) => (
  <>
    <Head>
      <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
    </Head>
    <Component {...pageProps} />
  </>
);

export default App;
