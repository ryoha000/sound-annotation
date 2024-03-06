/* @refresh reload */
import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "toastify-js/src/toastify.css";
import { render } from "solid-js/web";

import "./styles.css";
import App from "./App";

render(() => <App />, document.getElementById("root") as HTMLElement);
