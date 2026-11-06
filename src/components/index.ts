// The renderer for each OpenUI component name. A name missing here draws a
// "not supported yet" placeholder, and subsetLibrary() keeps it out of prompts.
import type { Components } from "../render/surface.ts";
import { Button, Buttons } from "./buttons.ts";
import { CheckBoxGroup, CheckBoxItem, ChipItem, Chips, RadioGroup, RadioItem, SwitchGroup, SwitchItem } from "./choice.ts";
import { BoldText, Callout, Icon, Label, MarkDownRenderer, Tag, Text, TextContent } from "./content.ts";
import { Form, FormControl, Input, TextArea } from "./forms.ts";
import { Card, CardHeader, Separator, Stack } from "./layout.ts";
import { Col, Table } from "./tables.ts";

export const components: Components = {
  // Layout
  Stack,
  Card,
  Separator,
  // Content
  CardHeader,
  TextContent,
  MarkDownRenderer,
  Callout,
  // Card building blocks
  Text,
  BoldText,
  // Data display
  Tag,
  Icon,
  // Tables
  Table,
  Col,
  // Forms
  Form,
  FormControl,
  Label,
  Input,
  TextArea,
  CheckBoxGroup,
  CheckBoxItem,
  RadioGroup,
  RadioItem,
  SwitchGroup,
  SwitchItem,
  Chips,
  ChipItem,
  // Buttons
  Button,
  Buttons,
};
