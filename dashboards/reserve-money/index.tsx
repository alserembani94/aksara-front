import { Container, Dropdown, Hero, Section } from "@components/index";
import { FunctionComponent, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { numFormat, smartNumFormat, toDate } from "@lib/helpers";
import { useTranslation } from "next-i18next";
import { useSlice } from "@hooks/useSlice";
import { useData } from "@hooks/useData";
import type { OptionType } from "@components/types";
import { AKSARA_COLOR } from "@lib/constants";
import type { ChartDatasetProperties, ChartTypeRegistry } from "chart.js";
import Slider from "@components/Chart/Slider";
import { track } from "@lib/mixpanel";
import { routes } from "@lib/routes";

/**
 * Reserve Money Dashboard
 * @overview Status: Live
 */

interface TimeseriesChartData {
  title: string;
  unitY: string;
  label: string;
  data: number[];
  fill: boolean;
  callout: string;
  prefix: string;
}

const Timeseries = dynamic(() => import("@components/Chart/Timeseries"), { ssr: false });

interface ReserveMoneyDashboardProps {
  last_updated: number;
  timeseries: any;
  timeseries_callouts: any;
}

const ReserveMoneyDashboard: FunctionComponent<ReserveMoneyDashboardProps> = ({
  last_updated,
  timeseries,
  timeseries_callouts,
}) => {
  const { t, i18n } = useTranslation();
  const INDEX_OPTIONS: Array<OptionType> = Object.keys(timeseries.data).map((key: string) => ({
    label: t(`reservemoney.keys.${key}`),
    value: key,
  }));
  const SHADE_OPTIONS: Array<OptionType> = [
    { label: t("reservemoney.keys.no_shade"), value: "no_shade" },
    { label: t("reservemoney.keys.recession"), value: "recession" },
  ];

  const { data, setData } = useData({
    index_type: INDEX_OPTIONS[0],
    shade_type: SHADE_OPTIONS[0],
    minmax: [0, timeseries.data[INDEX_OPTIONS[0].value].x.length - 1],
  });
  const LATEST_TIMESTAMP =
    timeseries.data[data.index_type.value].x[timeseries.data[data.index_type.value].x.length - 1];
  const { coordinate } = useSlice(timeseries.data[data.index_type.value], data.minmax);

  const shader = useCallback<
    (key: string) => ChartDatasetProperties<keyof ChartTypeRegistry, any[]>
  >(
    (key: string) => {
      if (key === "no_shade")
        return {
          data: [],
        };

      return {
        type: "line",
        data: coordinate[key],
        backgroundColor: AKSARA_COLOR.BLACK_H,
        borderWidth: 0,
        fill: true,
        yAxisID: "y2",
        stepped: true,
      };
    },
    [data]
  );

  const configs = useCallback<
    (key: string) => { prefix: string; unit: string; callout: string; fill: boolean }
  >(
    (key: string) => {
      const prefix =
        data.index_type.value.includes("value") && !data.index_type.value.includes("growth")
          ? "RM"
          : "";
      const unit = data.index_type.value.includes("growth") ? "%" : "";
      const callout = data.index_type.value.includes("growth")
        ? [
            numFormat(
              timeseries_callouts.data[data.index_type.value][key].callout,
              "standard",
              [1, 1]
            ),
            unit,
          ].join("")
        : [
            prefix,
            smartNumFormat({
              value: timeseries_callouts.data[data.index_type.value][key].callout,
              locale: i18n.language,
              precision: [1, 1],
            }),
          ].join("");
      return {
        prefix,
        unit,
        callout,
        fill: data.shade_type.value === "no_shade",
      };
    },
    [data.index_type, data.shade_type]
  );

  const getChartData = (sectionHeaders: string[]): TimeseriesChartData[] =>
    sectionHeaders.map(chartName => ({
      title: t(`reservemoney.keys.${chartName}`),
      unitY: configs(chartName).unit,
      label: t(`reservemoney.keys.${chartName}`),
      data: coordinate[chartName],
      fill: configs(chartName).fill,
      callout: configs(chartName).callout,
      prefix: configs(chartName).prefix,
    }));

  const section1ChartData = getChartData(["currency", "reserves_required", "reserves_excess"]);
  const section2ChartData = getChartData([
    "net_claims_gov",
    "claims_gov",
    "deposits_gov",
    "claims_private",
    "external",
    "others",
  ]);

  useEffect(() => {
    track("page_view", {
      type: "dashboard",
      id: "reservemoney.header",
      name_en: "Reserve Money",
      name_bm: "Wang Rizab",
      route: routes.RESERVE_MONEY,
    });
  }, []);

  return (
    <>
      <Hero background="reserve-money-banner">
        <div className="space-y-4 xl:w-2/3">
          <span className="text-sm font-bold uppercase tracking-widest text-primary">
            {t("nav.megamenu.categories.financial_sector")}
          </span>
          <h3>{t("reservemoney.header")}</h3>
          <p className="text-dim">{t("reservemoney.description")}</p>

          <p className="text-sm text-dim">
            {t("common.last_updated", {
              date: toDate(last_updated, "dd MMM yyyy, HH:mm", i18n.language),
            })}
          </p>
        </div>
      </Hero>

      <Container className="min-h-screen">
        {/* How is reserve money trending? */}
        <Section
          title={t("reservemoney.section_1.title")}
          description={t("reservemoney.section_1.description")}
          date={timeseries.data_as_of}
        >
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 lg:flex lg:flex-row">
              <Dropdown
                anchor="left"
                selected={data.index_type}
                options={INDEX_OPTIONS}
                onChange={e => setData("index_type", e)}
              />
              <Dropdown
                anchor="left"
                options={SHADE_OPTIONS}
                selected={data.shade_type}
                onChange={e => setData("shade_type", e)}
              />
            </div>

            <Slider
              type="range"
              value={data.minmax}
              data={timeseries.data[data.index_type.value].x}
              period="month"
              onChange={e => setData("minmax", e)}
            />
            <Timeseries
              title={t("reservemoney.keys.total")}
              className="h-[350px] w-full"
              interval="month"
              displayNumFormat={(value, type, precision) =>
                smartNumFormat({ value, type, precision, locale: i18n.language })
              }
              unitY={configs("total").unit}
              prefixY={configs("total").prefix}
              axisY={{
                y2: {
                  display: false,
                  grid: {
                    drawTicks: false,
                    drawBorder: false,
                    lineWidth: 0.5,
                  },
                  ticks: {
                    display: false,
                  },
                },
              }}
              data={{
                labels: coordinate.x,
                datasets: [
                  {
                    type: "line",
                    data: coordinate.total,
                    label: t("reservemoney.keys.total"),
                    borderColor: AKSARA_COLOR.PRIMARY,
                    backgroundColor: AKSARA_COLOR.PRIMARY_H,
                    borderWidth: 1.5,
                    fill: configs("total").fill,
                  },
                  shader(data.shade_type.value),
                ],
              }}
              stats={[
                {
                  title: t("common.latest", {
                    date: toDate(LATEST_TIMESTAMP, "MMM yyyy", i18n.language),
                  }),
                  value: configs("total").callout,
                },
              ]}
            />

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
              {section1ChartData.map(chartData => (
                <Timeseries
                  key={chartData.title}
                  title={chartData.title}
                  className="h-[350px] w-full"
                  interval="month"
                  displayNumFormat={(value, type, precision) =>
                    smartNumFormat({ value, type, precision, locale: i18n.language })
                  }
                  unitY={chartData.unitY}
                  prefixY={chartData.prefix}
                  axisY={{
                    y2: {
                      display: false,
                      grid: {
                        drawTicks: false,
                        drawBorder: false,
                        lineWidth: 0.5,
                      },
                      ticks: {
                        display: false,
                      },
                    },
                  }}
                  data={{
                    labels: coordinate.x,
                    datasets: [
                      {
                        type: "line",
                        label: chartData.label,
                        data: chartData.data,
                        borderColor: AKSARA_COLOR.PRIMARY,
                        backgroundColor: AKSARA_COLOR.PRIMARY_H,
                        fill: chartData.fill,
                        borderWidth: 1.5,
                      },
                      shader(data.shade_type.value),
                    ],
                  }}
                  stats={[
                    {
                      title: t("common.latest", {
                        date: toDate(LATEST_TIMESTAMP, "MMM yyyy", i18n.language),
                      }),
                      value: chartData.callout,
                    },
                  ]}
                />
              ))}
            </div>
          </div>
        </Section>
        {/* Factors affecting Reserve Money */}
        <Section
          title={t("reservemoney.section_2.title")}
          description={t("reservemoney.section_2.description")}
          date={timeseries.data_as_of}
        >
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {section2ChartData.map(chartData => (
              <Timeseries
                key={chartData.title}
                title={chartData.title}
                className="h-[350px] w-full"
                interval="month"
                displayNumFormat={(value, type, precision) =>
                  smartNumFormat({ value, type, precision, locale: i18n.language })
                }
                unitY={chartData.unitY}
                prefixY={chartData.prefix}
                axisY={{
                  y2: {
                    display: false,
                    grid: {
                      drawTicks: false,
                      drawBorder: false,
                      lineWidth: 0.5,
                    },
                    ticks: {
                      display: false,
                    },
                  },
                }}
                data={{
                  labels: coordinate.x,
                  datasets: [
                    {
                      type: "line",
                      label: chartData.label,
                      data: chartData.data,
                      borderColor: AKSARA_COLOR.PRIMARY,
                      backgroundColor: AKSARA_COLOR.PRIMARY_H,
                      fill: chartData.fill,
                      borderWidth: 1.5,
                    },
                    shader(data.shade_type.value),
                  ],
                }}
                stats={[
                  {
                    title: t("common.latest", {
                      date: toDate(LATEST_TIMESTAMP, "MMM yyyy", i18n.language),
                    }),
                    value: chartData.callout,
                  },
                ]}
              />
            ))}
          </div>
        </Section>
      </Container>
    </>
  );
};

export default ReserveMoneyDashboard;
