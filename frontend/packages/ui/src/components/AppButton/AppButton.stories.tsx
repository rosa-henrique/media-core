import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";

import AppButton from "./AppButton";

const meta = {
  title: "Components/AppButton",
  component: AppButton,
  args: {
    children: "Clique aqui",
    onClick: fn(),
  },
} satisfies Meta<typeof AppButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
