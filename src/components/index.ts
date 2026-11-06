// The renderer for each OpenUI component name. A name missing here draws a
// "not supported yet" placeholder, and subsetLibrary() keeps it out of prompts.
import type { Components } from "../render/surface.ts";
import { Button, Buttons } from "./buttons.ts";
import { Carousel } from "./carousel.ts";
import { CheckBoxGroup, CheckBoxItem, ChipItem, Chips, RadioGroup, RadioItem, SwitchGroup, SwitchItem } from "./choice.ts";
import { BoldText, Callout, Icon, Label, MarkDownRenderer, Tag, Text, TextContent } from "./content.ts";
import { DatePicker } from "./datepicker.ts";
import { Accordion, AccordionItem, Steps, StepsItem, TabItem, Tabs } from "./disclosure.ts";
import { Form, FormControl, Input, TextArea } from "./forms.ts";
import { Card, CardHeader, Separator, Stack } from "./layout.ts";
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
import { Modal } from "./modal.ts";
import { Col, Table } from "./tables.ts";

export const components: Components = {
  // Layout
  Stack,
  Card,
  Tabs,
  TabItem,
  Accordion,
  AccordionItem,
  Steps,
  StepsItem,
  Carousel,
  Separator,
  Modal,
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
  DatePicker,
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
  IconButton,
};
