// Shown when the mod opens without a `src`, and what `herdr-app check` renders.
export const DEMO = `root = Stack([header, intro, steps])
header = CardHeader("openGPUI", "OpenUI Lang drawn with native gpui elements")
intro = Callout("info", "No file to show", "This pane opened without a **src** prop. Agents open it with \`opengpui show <file.oui>\`.")
steps = Steps([StepsItem("Learn the language", "\`opengpui prompt\` prints the OpenUI Lang manual."), StepsItem("Write and check a file", "\`opengpui check ui.oui\` reports what the pane would refuse."), StepsItem("Show it", "\`opengpui show ui.oui\` opens it beside your terminal."), StepsItem("Get the answer", "Clicks come back in your terminal, or through \`opengpui wait ui.oui\`.")])
`;
