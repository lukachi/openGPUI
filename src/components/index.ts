// The renderer for each OpenUI component name. A name missing here draws a
// "not supported yet" placeholder, and subsetLibrary() keeps it out of prompts.
import type { Components } from "../render/surface.ts";
import { Button, Buttons } from "./buttons.ts";
import { Carousel } from "./carousel.ts";
import {
  CompositeCardBlock,
  CompositeCardItem,
  ContextCardBlock,
  ContextCardItem,
  OverviewCardBlock,
  OverviewCardItem,
  SnippetCardBlock,
  SnippetCardItem,
  VisualCardBlock,
  VisualCardItem,
} from "./cards/index.ts";
import {
  AreaChart,
  BarChart,
  HorizontalBarChart,
  LineChart,
  PieChart,
  Point,
  RadarChart,
  RadialChart,
  ScatterChart,
  ScatterSeries,
  Series,
  SingleStackedBarChart,
  Slice,
} from "./charts/index.ts";
import { CheckBoxGroup, CheckBoxItem, ChipItem, Chips, RadioGroup, RadioItem, SwitchGroup, SwitchItem } from "./choice.ts";
import { BoldText, Callout, Icon, Label, MarkDownRenderer, Tag, Text, TextContent } from "./content.ts";
import { DatePicker } from "./datepicker.ts";
import { Accordion, AccordionItem, Steps, StepsItem, TabItem, Tabs } from "./disclosure.ts";
import { EditableTable } from "./editable-table.ts";
import { Form, FormControl, Input, TextArea } from "./forms.ts";
import { Image, ImageBlock, ImageGallery, ImageText, ImageTextLarge } from "./images.ts";
import { Card, CardHeader, Separator, Stack } from "./layout.ts";
import { EntityList, FollowUpBlock, FollowUpItem, ListBlock, ListItem, SectionBlock, SectionItem } from "./lists.ts";
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
import { OptionCard, OptionCards } from "./option-cards.ts";
import { Select, SelectItem } from "./select.ts";
import { Slider } from "./slider.ts";
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
  Image,
  ImageBlock,
  ImageGallery,
  CodeBlock,
  InlineHeader,
  // Cards
  SnippetCardBlock,
  SnippetCardItem,
  OverviewCardBlock,
  OverviewCardItem,
  ContextCardBlock,
  ContextCardItem,
  CompositeCardBlock,
  CompositeCardItem,
  VisualCardBlock,
  VisualCardItem,
  // Card building blocks
  Text,
  BoldText,
  IconText,
  ImageText,
  ImageTextLarge,
  MetricIndicatorInline,
  MetricIndicatorWithStrikethrough,
  // Data display
  TagBlock,
  Tag,
  Icon,
  EntityList,
  ListBlock,
  ListItem,
  // Tables
  Table,
  Col,
  EditableTable,
  // Charts (2D)
  BarChart,
  LineChart,
  AreaChart,
  RadarChart,
  HorizontalBarChart,
  Series,
  // Charts (1D)
  PieChart,
  RadialChart,
  SingleStackedBarChart,
  Slice,
  // Charts (Scatter)
  ScatterChart,
  ScatterSeries,
  Point,
  // Lists & follow-ups (chat library)
  FollowUpBlock,
  FollowUpItem,
  // Sections (chat library)
  SectionBlock,
  SectionItem,
  // Forms
  Form,
  FormControl,
  Label,
  Input,
  TextArea,
  Select,
  SelectItem,
  DatePicker,
  Slider,
  CheckBoxGroup,
  CheckBoxItem,
  RadioGroup,
  RadioItem,
  SwitchGroup,
  SwitchItem,
  Chips,
  ChipItem,
  OptionCards,
  OptionCard,
  // Buttons
  Button,
  Buttons,
  IconButton,
};
