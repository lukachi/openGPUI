// The renderer for each OpenUI component name. A name missing here draws a
// "not supported yet" placeholder, and subsetLibrary() keeps it out of prompts.
import type { Components } from "../render/surface.ts";
import { Button, Buttons } from "./buttons.ts";
import { BoldText, Callout, Icon, Label, MarkDownRenderer, Tag, Text, TextContent } from "./content.ts";
import { Form, FormControl, Input, TextArea } from "./forms.ts";
import { Card, CardHeader, Separator, Stack } from "./layout.ts";
import { Col, Table } from "./tables.ts";
import {
  CodeBlock,
  IconButton,
  IconText,
  InlineHeader,
  MetricIndicatorInline,
  MetricIndicatorWithStrikethrough,
  TagBlock,
  TextCallout,
} from "./misc.ts";

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
  TextCallout,
  CodeBlock,
  InlineHeader,
  // Card building blocks
  Text,
  BoldText,
  IconText,
  MetricIndicatorInline,
  MetricIndicatorWithStrikethrough,
  // Data display
  TagBlock,
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
  // Buttons
  Button,
  Buttons,
  IconButton,
};
