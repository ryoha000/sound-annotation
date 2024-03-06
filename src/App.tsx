import { createEffect, createMemo, createSignal } from "solid-js";
import AButton from "./components/parts/Button";
import { open } from "@tauri-apps/api/dialog";
import { fs, invoke, shell } from "@tauri-apps/api";
import { FileEntry } from "@tauri-apps/api/fs";
import AudioContainer from "./components/audio/AudioContainer";
import useLog from "./store/log";

import Toastify from "toastify-js";
import hotkeys from "hotkeys-js";
import { Annotation } from "./types";

const showInfo = (message: string) => {
  console.info(message);
  Toastify({
    text: message,
    duration: 3000,
    gravity: "bottom",
    position: "right",
    style: { background: "#2c3e50", padding: "16px", borderRadius: "8px" },
  }).showToast();
};

const showError = (message: string) => {
  console.error(message);
  Toastify({
    text: message,
    duration: 3000,
    gravity: "bottom",
    position: "right",
    style: { background: "#b82047", padding: "16px", borderRadius: "8px" },
  }).showToast();
};

// 対応する拡張子
const SUPPORTED_AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg"];

function App() {
  const [annotation, setAnnotation] = createSignal<Annotation | null>(null);
  const { checkNeededToProcess, insertLog, getLastInsertedLog } = useLog();

  const [selectedFolder, setSelectedFolder] = createSignal("");
  const onClickSelectFolder = async () => {
    const result = await open({ directory: true });
    if (result && !Array.isArray(result)) {
      setSelectedFolder(result);
    }
  };

  const [includedAudioFiles, setIncludedAudioFiles] = createSignal<string[]>(
    []
  );
  const remainingAudioFileLength = createMemo(
    () => includedAudioFiles().length
  );
  const [targetAudioFile, setTargetAudioFile] = createSignal<string | null>(
    null
  );
  createEffect(() => setAnnotation(null));

  const fileEntryToPathRecursive = (entry: FileEntry): string[] => [
    entry.path,
    ...(entry.children
      ? entry.children.map(fileEntryToPathRecursive).flatMap((v) => v)
      : []),
  ];
  const initializeIncludedAudioFiles = async (folder: string) => {
    const fileEntries = await fs.readDir(folder, { recursive: true });
    const supportedFiles = fileEntries
      .map(fileEntryToPathRecursive)
      .flatMap((v) => v)
      .filter((path) => {
        const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
        return SUPPORTED_AUDIO_EXTENSIONS.includes(ext);
      });
    setIncludedAudioFiles(supportedFiles);
  };

  createEffect(async () => {
    const folder = selectedFolder();
    if (folder) {
      await initializeIncludedAudioFiles(folder);
      setTargetAudioFile(await getNextTargetAudioFile());
    }
  });

  const getNextTargetAudioFile = async () => {
    const files = includedAudioFiles();

    while (files.length > 0) {
      const file = files.shift()!;
      const needToProcess = await checkNeededToProcess(file);
      if (needToProcess) {
        setIncludedAudioFiles(files);
        return file;
      }
    }

    setIncludedAudioFiles(files);
    return null;
  };
  const onClickNext = async () => {
    const file = targetAudioFile();
    if (!file) return;
    await invoke("annotate", { annotationData: annotation() });
    await insertLog({ file: file, status: "processed", createdAt: Date.now() });
    setTargetAudioFile(await getNextTargetAudioFile());
  };
  hotkeys("enter", () => {
    onClickNext();
  });

  const onClickSkip = async () => {
    const file = targetAudioFile();
    if (!file) return;
    await insertLog({ file: file, status: "skipped", createdAt: Date.now() });
    setTargetAudioFile(await getNextTargetAudioFile());
  };

  const onClickPrev = async () => {
    const lastInsertedLog = await getLastInsertedLog();
    if (!lastInsertedLog) {
      return showError("最後に処理したファイルがありません");
    }
    setTargetAudioFile(lastInsertedLog.file);
  };

  const onClickOpenSaveFolder = async () => {
    const saveRootDir = await invoke<string>("open_save_root_dir");
    console.log({ saveRootDir });
    await shell.open(saveRootDir);
  };

  return (
    <div class="bg-bg-primary min-h-full p-8 font-sans space-y-8">
      <div class="flex-(~ wrap) items-center gap-8">
        <AButton icon="i-material-symbols-folder" onClick={onClickSelectFolder}>
          フォルダを選択する
        </AButton>
        <div class="text-text-primary text-xs">
          Path: {selectedFolder() || "未選択"}
        </div>
        <div class="text-text-primary text-xs">
          File Count: {remainingAudioFileLength()}
        </div>
      </div>
      {targetAudioFile() && (
        <AudioContainer
          file={targetAudioFile()!}
          onChangeAnnotation={setAnnotation}
        />
      )}
      <div class="flex items-center gap-4">
        <AButton icon="i-material-symbols-arrow-left-alt" onClick={onClickPrev}>
          Prev
        </AButton>
        <AButton rightIcon="i-material-symbols-skip-next" onClick={onClickSkip}>
          Skip
        </AButton>
        <AButton
          rightIcon="i-material-symbols-arrow-right-alt"
          onClick={onClickNext}
        >
          Next
        </AButton>
      </div>
      <AButton
        icon="i-material-symbols-open-in-new-rounded"
        onClick={onClickOpenSaveFolder}
      >
        保存フォルダを開く
      </AButton>
    </div>
  );
}

export default App;
