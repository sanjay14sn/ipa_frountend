import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FilePreviewBody } from "@/components/shared/file-preview/file-preview-body";
import { ExpandableImage } from "@/components/shared/file-preview/expandable-image";
import { api } from "@/lib/axios";
import { triggerBlobDownload } from "@/lib/download";
import { loadPdfjs } from "@/lib/pdfjs";

vi.mock("@/lib/axios", () => ({
  api: { get: vi.fn() },
}));

vi.mock("@/lib/download", () => ({
  triggerBlobDownload: vi.fn(),
}));

const fakePage = {
  getViewport: ({ scale }: { scale: number }) => ({
    width: 600 * scale,
    height: 800 * scale,
  }),
  render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
};

const fakeDoc = {
  numPages: 3,
  getPage: vi.fn(async () => fakePage),
  loadingTask: { destroy: vi.fn(async () => {}) },
};

vi.mock("@/lib/pdfjs", () => ({
  loadPdfjs: vi.fn(async () => ({
    getDocument: () => ({ promise: Promise.resolve(fakeDoc) }),
  })),
}));

// Untyped mock handle: axios overloads make mockResolvedValue reject partial
// AxiosResponse shapes, and only `data` matters to the component.
const apiGet = api.get as unknown as ReturnType<typeof vi.fn>;

// jsdom has no object-URL support.
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

const urlSource = (filename = "photo.png") =>
  ({ kind: "url", url: "/uploads/x", filename }) as const;

describe("FilePreviewBody", () => {
  it("renders an image blob as an <img> without loading pdf.js", async () => {
    apiGet.mockResolvedValue({ data: new Blob(["png"], { type: "image/png" }) });
    render(<FilePreviewBody source={urlSource()} />);
    expect(await screen.findByAltText("photo.png")).toBeInTheDocument();
    expect(loadPdfjs).not.toHaveBeenCalled();
  });

  it("renders a PDF blob through pdf.js with a page pager", async () => {
    apiGet.mockResolvedValue({
      data: new Blob(["%PDF"], { type: "application/pdf" }),
    });
    render(<FilePreviewBody source={urlSource("doc.pdf")} />);
    expect(await screen.findByText("Page 1 / 3")).toBeInTheDocument();
    expect(loadPdfjs).toHaveBeenCalledTimes(1);
  });

  it("shows the unsupported state with Download still available", async () => {
    apiGet.mockResolvedValue({ data: new Blob(["x"], { type: "text/plain" }) });
    render(<FilePreviewBody source={urlSource("notes.txt")} />);
    expect(
      await screen.findByText("This file can't be previewed"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(triggerBlobDownload).toHaveBeenCalledWith(
      expect.any(Blob),
      "notes.txt",
    );
  });

  it("shows the error state and refetches on Retry", async () => {
    apiGet.mockRejectedValueOnce(new Error("network"));
    apiGet.mockResolvedValueOnce({
      data: new Blob(["png"], { type: "image/png" }),
    });
    render(<FilePreviewBody source={urlSource()} />);
    expect(await screen.findByText("Couldn't load preview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByAltText("photo.png")).toBeInTheDocument();
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it("downloads the fetched blob with the source filename", async () => {
    apiGet.mockResolvedValue({ data: new Blob(["png"], { type: "image/png" }) });
    render(<FilePreviewBody source={urlSource("scan.png")} />);
    await screen.findByAltText("scan.png");
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(triggerBlobDownload).toHaveBeenCalledWith(
      expect.any(Blob),
      "scan.png",
    );
  });

  it("uses a pre-fetched blob source without hitting the API", async () => {
    render(
      <FilePreviewBody
        source={{
          kind: "blob",
          blob: new Blob(["png"], { type: "image/png" }),
          filename: "merged.png",
        }}
      />,
    );
    expect(await screen.findByAltText("merged.png")).toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalled();
  });

  it("turns PDF pages with arrow keys", async () => {
    apiGet.mockResolvedValue({
      data: new Blob(["%PDF"], { type: "application/pdf" }),
    });
    render(<FilePreviewBody source={urlSource("doc.pdf")} />);
    await screen.findByText("Page 1 / 3");
    fireEvent.keyDown(screen.getByTestId("file-preview-body"), {
      key: "ArrowRight",
    });
    expect(await screen.findByText("Page 2 / 3")).toBeInTheDocument();
  });

  it("renders the document pager with bounds and change callback", async () => {
    apiGet.mockResolvedValue({ data: new Blob(["png"], { type: "image/png" }) });
    const onIndexChange = vi.fn();
    render(
      <FilePreviewBody
        source={urlSource()}
        position={{ index: 0, count: 2, onIndexChange }}
      />,
    );
    await screen.findByText("Document 1 / 2");
    expect(
      screen.getByRole("button", { name: "Previous document" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next document" }));
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });
});

describe("ExpandableImage", () => {
  it("opens the preview dialog on click", async () => {
    apiGet.mockResolvedValue({ data: new Blob(["png"], { type: "image/png" }) });
    render(
      <ExpandableImage
        src="/uploads/profile-photos/students/1.png"
        alt="Student photo"
      />,
    );
    fireEvent.click(screen.getByTestId("expandable-image"));
    expect(screen.getByTestId("file-preview-body")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getAllByAltText("Student photo")).toHaveLength(2),
    );
  });
});
