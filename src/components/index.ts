// The renderer for each OpenUI component name. A name missing here draws a
// "not supported yet" placeholder, and subsetLibrary() keeps it out of prompts.
import type { Component, Components } from "../render/surface.ts";
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

/**
 * Drawn in a retained view of its own (Component.view): its render costs grow with its
 * content, or it owns state that redraws often (hover, measuring, typing, loads).
 */
const view = (c: Component): Component => ({ ...c, view: true });
/** A card block: a view whose slots draw inline in it, since it restyles them; what they hold may be views. */
const cardBlock = (c: Component): Component => ({ ...c, view: true, inlineChildren: true });

export const components: Components = {
  // Layout
  Stack,
  Card,
  Tabs: view(Tabs),
  TabItem,
  Accordion: view(Accordion),
  AccordionItem,
  Steps: view(Steps),
  StepsItem,
  Carousel: view(Carousel),
  Separator,
  Modal,
  // Content
  CardHeader,
  TextContent: view(TextContent),
  MarkDownRenderer: view(MarkDownRenderer),
  Callout: view(Callout),
  TextCallout,
  Image: view(Image),
  ImageBlock: view(ImageBlock),
  ImageGallery: view(ImageGallery),
  CodeBlock: view(CodeBlock),
  InlineHeader,
  // Cards
  SnippetCardBlock: cardBlock(SnippetCardBlock),
  SnippetCardItem,
  OverviewCardBlock: cardBlock(OverviewCardBlock),
  OverviewCardItem,
  ContextCardBlock: cardBlock(ContextCardBlock),
  ContextCardItem,
  CompositeCardBlock: cardBlock(CompositeCardBlock),
  CompositeCardItem,
  VisualCardBlock: cardBlock(VisualCardBlock),
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
  EntityList: view(EntityList),
  ListBlock: view(ListBlock),
  ListItem,
  // Tables
  Table: view(Table),
  Col,
  EditableTable: view(EditableTable),
  // Charts (2D)
  BarChart: view(BarChart),
  LineChart: view(LineChart),
  AreaChart: view(AreaChart),
  RadarChart: view(RadarChart),
  HorizontalBarChart: view(HorizontalBarChart),
  Series,
  // Charts (1D)
  PieChart: view(PieChart),
  RadialChart: view(RadialChart),
  SingleStackedBarChart: view(SingleStackedBarChart),
  Slice,
  // Charts (Scatter)
  ScatterChart: view(ScatterChart),
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
  Input: view(Input),
  TextArea: view(TextArea),
  Select: view(Select),
  SelectItem,
  DatePicker: view(DatePicker),
  Slider: view(Slider),
  CheckBoxGroup: view(CheckBoxGroup),
  CheckBoxItem,
  RadioGroup: view(RadioGroup),
  RadioItem,
  SwitchGroup: view(SwitchGroup),
  SwitchItem,
  Chips: view(Chips),
  ChipItem,
  OptionCards: view(OptionCards),
  OptionCard,
  // Buttons
  Button,
  Buttons,
  IconButton,
};
