import "./public-artwork.css";

type PublicArtworkProps = {
  placement: "header" | "footer";
};

export default function PublicArtwork({ placement }: PublicArtworkProps) {
  return (
    <img
      src={`/brand/${placement}.svg`}
      width="2048"
      height={placement === "header" ? 516 : 512}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading={placement === "footer" ? "lazy" : "eager"}
      decoding="async"
      className={`public-artwork public-artwork--${placement}`}
    />
  );
}
