import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {
  Region,
} from "wavesurfer.js/dist/plugins/regions.esm.js";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import hotkeys from "hotkeys-js";
import { Annotation } from "../../types";

type Props = {
  file: string;
  onChangeAnnotation: (annotation: Annotation) => void;
};

const AudioContainer: Component<Props> = (props) => {
  const [phase, setPhase] = createSignal<
    "roughEntire" | "roughPoint" | "precisePoint"
  >("roughEntire");
  const phaseLabel = createMemo(() => {
    const p = phase();
    switch (p) {
      case "roughEntire":
        return "全体を選択";
      case "roughPoint":
        return "注目を選択";
      case "precisePoint":
        return "注目を調整";
      default:
        throw new Error(`invalid phase. phase: ${p satisfies never}`);
    }
  });
  let wavesurfer: WaveSurfer | null = null;
  let mediaElement: HTMLMediaElement | null = null;
  let audioContext: AudioContext | null = null;
  let onClickSpace: () => void = () => {};

  const createWavesurfer = () => {
    const audio = new Audio();
    audio.controls = true;
    audio.src = convertFileSrc(props.file);
    audio.crossOrigin = "anonymous";

    const ws = WaveSurfer.create({
      container: "#waveform",
      waveColor: "#b4c8dc",
      progressColor: "#4b535c",
      media: audio,
    });
    ws.on("ready", () => {
      ws.play();
    });
    ws.on("click", (e) => {
      console.log("click", e);
    });
    // TODO: dragstart, dragend がリリースされたら実装する
    // ws.on("dragstart", (e) => {
    //   console.log("dragstart", e);
    // });
    // ws.on("dragend", (e) => {
    //   console.log("dragend", e);
    // });

    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    let cancelRegionCreator: (() => void) | null =
      wsRegions.enableDragSelection({
        color: "#2e4c771a",
      });

    let entireRegion: Region | null = null;
    let pointRegion: Region | null = null;

    wsRegions.on("region-created", async (region) => {
      if (cancelRegionCreator) {
        cancelRegionCreator();
        cancelRegionCreator = null;
      }
      // await new Promise((r) => setTimeout(r, 0));
      const p = phase();
      switch (p) {
        case "roughEntire":
          cancelRegionCreator = wsRegions.enableDragSelection({
            color: "#5ca4ff1a",
          });
          entireRegion = region;
          setPhase("roughPoint");
          return;
        case "roughPoint":
          pointRegion = region;
          setPhase("precisePoint");
          return;
        case "precisePoint":
          return;
        default:
          throw new Error(`invalid phase. phase: ${p satisfies never}`);
      }
    });

    wsRegions.on("region-out", (region) => {
      if (region.id === entireRegion?.id) {
        ws.pause();
      }
    });

    wsRegions.on("region-updated", (region) => {
      if (region.id === entireRegion?.id) {
        entireRegion = region;
      }
      if (region.id === pointRegion?.id) {
        pointRegion = region;
      }

      props.onChangeAnnotation({
        filePath: props.file,
        entire: {
          start: entireRegion?.start ?? 0,
          end: entireRegion?.end ?? 0,
        },
        point: { start: pointRegion?.start ?? 0, end: pointRegion?.end ?? 0 },
      });
    });

    const ctx = new AudioContext();
    const gainNode = ctx.createGain();

    audio.addEventListener(
      "canplay",
      () => {
        const mediaNode = ctx.createMediaElementSource(audio);

        mediaNode.connect(gainNode).connect(ctx.destination);
      },
      { once: true }
    );

    audio.addEventListener("play", () => {
      // pointRegion の start と end の間音量を0にする
      if (pointRegion) {
        const start = pointRegion.start - audio.currentTime;
        const end = pointRegion.end - audio.currentTime;

        const currentTime = ctx.currentTime;

        gainNode.gain.setValueAtTime(1, currentTime);
        gainNode.gain.setValueAtTime(0, currentTime + start);
        gainNode.gain.setValueAtTime(1, currentTime + end);
      }
    });

    const play = () => {
      if (entireRegion) {
        ws.setTime(entireRegion.start);
      } else {
        ws.setTime(0);
      }
      return ws.play();
    };

    return [ws, audio, ctx, play] as const;
  };
  const setWaveSurfer = (
    ws: WaveSurfer,
    audio: HTMLMediaElement,
    ctx: AudioContext,
    play: () => void
  ) => {
    if (wavesurfer) {
      wavesurfer.destroy();
    }
    if (mediaElement) {
      mediaElement.pause();
      mediaElement.src = "";
    }
    if (audioContext) {
      audioContext.close();
    }

    wavesurfer = ws;
    mediaElement = audio;
    audioContext = ctx;
    onClickSpace = play;

    setPhase("roughEntire");
  };

  createEffect(() => {
    const [ws, audio, ctx, play] = createWavesurfer();
    setWaveSurfer(ws, audio, ctx, play);
  });

  onMount(() => {
    hotkeys("space", (e) => {
      e.stopPropagation();
      onClickSpace();
    });
  });
  return (
    <div class="space-y-4">
      <div>text</div>
      <div id="waveform"></div>
      <div class="flex">
        <div class="grid-(~ cols-[min-content_1fr]) gap-x-4 text-(text-primary xs) ml-auto">
          <div>Phase</div>
          <div>{phaseLabel()}</div>
          <div>File</div>
          <div>{props.file}</div>
        </div>
      </div>
    </div>
  );
};

export default AudioContainer;
