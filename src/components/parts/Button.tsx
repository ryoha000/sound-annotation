import { Button } from "@kobalte/core";
import { ParentComponent } from "solid-js";

type Props = {
  icon?: string;
  rightIcon?: string;
  onClick?: () => void;
};

const AButton: ParentComponent<Props> = (props) => {
  return (
    <Button.Root
      class="flex items-center gap-4 p-(x4 y2) rounded-xl bg-bg-button border-(~ border-button opacity-10 solid) text-text-primary hover:(border-border-button-hover bg-bg-button-hover)"
      onClick={props.onClick}
    >
      {props.icon && <div class={`${props.icon} w-6 h-6`} />}
      {props.children}
      {props.rightIcon && <div class={`${props.rightIcon} w-6 h-6`} />}
    </Button.Root>
  );
};

export default AButton;
