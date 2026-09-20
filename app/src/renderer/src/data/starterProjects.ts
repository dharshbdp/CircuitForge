import type { CircuitForgeProject } from '../../../shared/types'

export interface StarterProject {
  id: string
  name: string
  description: string
  difficulty: 'Beginner' | 'Intermediate'
  boardId: string
  baudRate: number
  hardwareTags: string[]
  project: CircuitForgeProject
}

export const STARTER_PROJECTS: StarterProject[] = [
  {
    id: 'blink-fade',
    name: 'Blink & Fade',
    description:
      'Digital LED blinking on Pin 13 paired with analog PWM brightness fading on Pin 9.',
    difficulty: 'Beginner',
    boardId: 'arduino:avr:uno',
    baudRate: 115200,
    hardwareTags: ['Arduino Uno', 'LED', '220Ω Resistor', 'Breadboard'],
    project: {
      formatVersion: '1.0',
      name: 'Blink & Fade',
      description: 'Digital LED blinking on Pin 13 and PWM brightness fading on Pin 9.',
      boardId: 'arduino:avr:uno',
      baudRate: 115200,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
      workspace: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'pin_digital_write',
              id: 'blink_high',
              x: 48,
              y: 48,
              fields: { PIN: '13', STATE: 'HIGH' },
              next: {
                block: {
                  type: 'pin_analog_write',
                  id: 'pwm_high',
                  fields: { PIN: '9' },
                  inputs: {
                    VALUE: {
                      shadow: { type: 'math_number', id: 'val_255', fields: { NUM: 255 } }
                    }
                  },
                  next: {
                    block: {
                      type: 'time_delay',
                      id: 'delay_1',
                      inputs: {
                        DELAY_MS: {
                          shadow: { type: 'math_number', id: 'd1_num', fields: { NUM: 500 } }
                        }
                      },
                      next: {
                        block: {
                          type: 'pin_digital_write',
                          id: 'blink_low',
                          fields: { PIN: '13', STATE: 'LOW' },
                          next: {
                            block: {
                              type: 'pin_analog_write',
                              id: 'pwm_low',
                              fields: { PIN: '9' },
                              inputs: {
                                VALUE: {
                                  shadow: {
                                    type: 'math_number',
                                    id: 'val_32',
                                    fields: { NUM: 32 }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'time_delay',
                                  id: 'delay_2',
                                  inputs: {
                                    DELAY_MS: {
                                      shadow: {
                                        type: 'math_number',
                                        id: 'd2_num',
                                        fields: { NUM: 500 }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: 'obstacle-avoidance',
    name: 'Smart Obstacle Avoidance',
    description:
      'HC-SR04 ultrasonic distance sensing that steers an SG90 micro-servo motor away from obstacles.',
    difficulty: 'Intermediate',
    boardId: 'arduino:avr:uno',
    baudRate: 115200,
    hardwareTags: ['Arduino Uno', 'HC-SR04 Ultrasonic', 'SG90 Micro Servo'],
    project: {
      formatVersion: '1.0',
      name: 'Smart Obstacle Avoidance',
      description: 'Ultrasonic distance sensing with automatic servo steering.',
      boardId: 'arduino:avr:uno',
      baudRate: 115200,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
      workspace: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'controls_if',
              id: 'if_obstacle',
              x: 48,
              y: 48,
              extraState: { hasElse: true },
              inputs: {
                IF0: {
                  block: {
                    type: 'logic_compare',
                    id: 'cmp_dist',
                    fields: { OP: 'LT' },
                    inputs: {
                      A: {
                        block: {
                          type: 'sensor_ultrasonic',
                          id: 'us_read',
                          fields: { TRIG_PIN: '9', ECHO_PIN: '10' }
                        }
                      },
                      B: {
                        shadow: { type: 'math_number', id: 'dist_threshold', fields: { NUM: 20 } }
                      }
                    }
                  }
                },
                DO0: {
                  block: {
                    type: 'serial_print',
                    id: 'print_warn',
                    fields: { NEWLINE: true },
                    inputs: {
                      CONTENT: {
                        shadow: {
                          type: 'text',
                          id: 'txt_warn',
                          fields: { TEXT: 'Obstacle detected! Turning servo to 90 deg' }
                        }
                      }
                    },
                    next: {
                      block: {
                        type: 'actuator_servo',
                        id: 'servo_turn',
                        fields: { PIN: '6' },
                        inputs: {
                          ANGLE: {
                            shadow: { type: 'math_number', id: 'angle_90', fields: { NUM: 90 } }
                          }
                        },
                        next: {
                          block: {
                            type: 'time_delay',
                            id: 'delay_turn',
                            inputs: {
                              DELAY_MS: {
                                shadow: {
                                  type: 'math_number',
                                  id: 'turn_ms',
                                  fields: { NUM: 300 }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                },
                ELSE: {
                  block: {
                    type: 'serial_print',
                    id: 'print_clear',
                    fields: { NEWLINE: true },
                    inputs: {
                      CONTENT: {
                        shadow: {
                          type: 'text',
                          id: 'txt_clear',
                          fields: { TEXT: 'Clear path. Servo centered at 0 deg' }
                        }
                      }
                    },
                    next: {
                      block: {
                        type: 'actuator_servo',
                        id: 'servo_center',
                        fields: { PIN: '6' },
                        inputs: {
                          ANGLE: {
                            shadow: { type: 'math_number', id: 'angle_0', fields: { NUM: 0 } }
                          }
                        },
                        next: {
                          block: {
                            type: 'time_delay',
                            id: 'delay_clear',
                            inputs: {
                              DELAY_MS: {
                                shadow: {
                                  type: 'math_number',
                                  id: 'clear_ms',
                                  fields: { NUM: 100 }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: 'weather-station',
    name: 'Weather Station',
    description:
      'DHT11/DHT22 temperature & humidity monitoring with continuous serial telemetry stream.',
    difficulty: 'Beginner',
    boardId: 'arduino:avr:uno',
    baudRate: 115200,
    hardwareTags: ['Arduino Uno / ESP32', 'DHT11 / DHT22 Sensor', '10kΩ Pull-up'],
    project: {
      formatVersion: '1.0',
      name: 'Weather Station',
      description: 'DHT11/DHT22 temperature & humidity sensor with live telemetry output.',
      boardId: 'arduino:avr:uno',
      baudRate: 115200,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
      workspace: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'serial_print',
              id: 'lbl_temp',
              x: 48,
              y: 48,
              fields: { NEWLINE: false },
              inputs: {
                CONTENT: {
                  shadow: { type: 'text', id: 'txt_t', fields: { TEXT: 'temp:' } }
                }
              },
              next: {
                block: {
                  type: 'serial_print',
                  id: 'val_temp',
                  fields: { NEWLINE: false },
                  inputs: {
                    CONTENT: {
                      block: {
                        type: 'sensor_dht',
                        id: 'dht_read_t',
                        fields: { MODEL: 'DHT11', PIN: '2', METRIC: 'TEMP_C' }
                      }
                    }
                  },
                  next: {
                    block: {
                      type: 'serial_print',
                      id: 'lbl_hum',
                      fields: { NEWLINE: false },
                      inputs: {
                        CONTENT: {
                          shadow: { type: 'text', id: 'txt_h', fields: { TEXT: ',hum:' } }
                        }
                      },
                      next: {
                        block: {
                          type: 'serial_print',
                          id: 'val_hum',
                          fields: { NEWLINE: true },
                          inputs: {
                            CONTENT: {
                              block: {
                                type: 'sensor_dht',
                                id: 'dht_read_h',
                                fields: { MODEL: 'DHT11', PIN: '2', METRIC: 'HUMIDITY' }
                              }
                            }
                          },
                          next: {
                            block: {
                              type: 'time_delay',
                              id: 'dht_delay',
                              inputs: {
                                DELAY_MS: {
                                  shadow: {
                                    type: 'math_number',
                                    id: 'dht_ms',
                                    fields: { NUM: 1000 }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: 'rgb-mood-lamp',
    name: 'RGB Mood Lamp',
    description: 'Addressable WS2812B NeoPixel ring color sequences with smooth transitions.',
    difficulty: 'Intermediate',
    boardId: 'arduino:avr:uno',
    baudRate: 115200,
    hardwareTags: ['Arduino Uno', 'WS2812B NeoPixel Ring (8 LEDs)'],
    project: {
      formatVersion: '1.0',
      name: 'RGB Mood Lamp',
      description: 'Addressable WS2812B NeoPixel ring RGB color animations.',
      boardId: 'arduino:avr:uno',
      baudRate: 115200,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
      workspace: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'neopixel_init',
              id: 'np_init',
              x: 48,
              y: 48,
              fields: { PIN: '6' },
              inputs: {
                COUNT: {
                  shadow: { type: 'math_number', id: 'np_count', fields: { NUM: 8 } }
                }
              },
              next: {
                block: {
                  type: 'neopixel_set_color',
                  id: 'np_color1',
                  fields: { PIN: '6' },
                  inputs: {
                    PIXEL: {
                      shadow: { type: 'math_number', id: 'px0', fields: { NUM: 0 } }
                    },
                    RED: {
                      shadow: { type: 'math_number', id: 'r255', fields: { NUM: 255 } }
                    },
                    GREEN: {
                      shadow: { type: 'math_number', id: 'g0', fields: { NUM: 0 } }
                    },
                    BLUE: {
                      shadow: { type: 'math_number', id: 'b128', fields: { NUM: 128 } }
                    }
                  },
                  next: {
                    block: {
                      type: 'time_delay',
                      id: 'np_d1',
                      inputs: {
                        DELAY_MS: {
                          shadow: { type: 'math_number', id: 'ms500_1', fields: { NUM: 500 } }
                        }
                      },
                      next: {
                        block: {
                          type: 'neopixel_set_color',
                          id: 'np_color2',
                          fields: { PIN: '6' },
                          inputs: {
                            PIXEL: {
                              shadow: { type: 'math_number', id: 'px0_2', fields: { NUM: 0 } }
                            },
                            RED: {
                              shadow: { type: 'math_number', id: 'r0_2', fields: { NUM: 0 } }
                            },
                            GREEN: {
                              shadow: {
                                type: 'math_number',
                                id: 'g200_2',
                                fields: { NUM: 200 }
                              }
                            },
                            BLUE: {
                              shadow: {
                                type: 'math_number',
                                id: 'b255_2',
                                fields: { NUM: 255 }
                              }
                            }
                          },
                          next: {
                            block: {
                              type: 'time_delay',
                              id: 'np_d2',
                              inputs: {
                                DELAY_MS: {
                                  shadow: {
                                    type: 'math_number',
                                    id: 'ms500_2',
                                    fields: { NUM: 500 }
                                  }
                                }
                              },
                              next: {
                                block: {
                                  type: 'neopixel_clear',
                                  id: 'np_clr',
                                  fields: { PIN: '6' },
                                  next: {
                                    block: {
                                      type: 'time_delay',
                                      id: 'np_d3',
                                      inputs: {
                                        DELAY_MS: {
                                          shadow: {
                                            type: 'math_number',
                                            id: 'ms200',
                                            fields: { NUM: 200 }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  },
  {
    id: 'mq2-gas-detector',
    name: 'Gas & Smoke Detector',
    description:
      'MQ-2 sensor with automated 20-second heater warm-up, analog gas telemetry, and threshold alerting.',
    difficulty: 'Beginner',
    boardId: 'arduino:avr:uno',
    baudRate: 115200,
    hardwareTags: ['Arduino Uno', 'MQ-2 Gas/Smoke Sensor', 'Buzzer / LED'],
    project: {
      formatVersion: '1.0',
      name: 'Gas & Smoke Detector',
      description: 'MQ-2 gas/smoke sensor with 20s warm-up and threshold detection.',
      boardId: 'arduino:avr:uno',
      baudRate: 115200,
      createdAt: '2026-09-20T00:00:00.000Z',
      updatedAt: '2026-09-20T00:00:00.000Z',
      workspace: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sensor_mq2_warmup',
              id: 'mq2_warmup',
              x: 48,
              y: 48,
              inputs: {
                SECONDS: {
                  shadow: { type: 'math_number', id: 'warmup_sec', fields: { NUM: 20 } }
                }
              },
              next: {
                block: {
                  type: 'serial_print',
                  id: 'mq2_lbl',
                  fields: { NEWLINE: false },
                  inputs: {
                    CONTENT: {
                      shadow: { type: 'text', id: 'txt_mq2_val', fields: { TEXT: 'gas_level:' } }
                    }
                  },
                  next: {
                    block: {
                      type: 'serial_print',
                      id: 'mq2_val',
                      fields: { NEWLINE: true },
                      inputs: {
                        CONTENT: {
                          block: {
                            type: 'sensor_mq2_read',
                            id: 'mq2_read_raw',
                            fields: { PIN: 'A0', MODE: 'RAW' }
                          }
                        }
                      },
                      next: {
                        block: {
                          type: 'controls_if',
                          id: 'mq2_if',
                          inputs: {
                            IF0: {
                              block: {
                                type: 'logic_compare',
                                id: 'mq2_cmp',
                                fields: { OP: 'GT' },
                                inputs: {
                                  A: {
                                    block: {
                                      type: 'sensor_mq2_read',
                                      id: 'mq2_read_cmp',
                                      fields: { PIN: 'A0', MODE: 'RAW' }
                                    }
                                  },
                                  B: {
                                    shadow: {
                                      type: 'math_number',
                                      id: 'mq2_thresh',
                                      fields: { NUM: 400 }
                                    }
                                  }
                                }
                              }
                            },
                            DO0: {
                              block: {
                                type: 'pin_digital_write',
                                id: 'mq2_alert_pin',
                                fields: { PIN: '13', STATE: 'HIGH' },
                                next: {
                                  block: {
                                    type: 'serial_print',
                                    id: 'mq2_alert_print',
                                    fields: { NEWLINE: true },
                                    inputs: {
                                      CONTENT: {
                                        shadow: {
                                          type: 'text',
                                          id: 'txt_mq2_warn',
                                          fields: { TEXT: 'WARNING: Elevated Gas Detected!' }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          },
                          next: {
                            block: {
                              type: 'time_delay',
                              id: 'mq2_loop_delay',
                              inputs: {
                                DELAY_MS: {
                                  shadow: {
                                    type: 'math_number',
                                    id: 'mq2_d_ms',
                                    fields: { NUM: 500 }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          ]
        }
      }
    }
  }
]
