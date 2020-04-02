#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <math.h>

#include "shell.h"
#include "msg.h"
#include "net/emcute.h"
#include "net/ipv6/addr.h"
#include "saul.h"
#include "saul_reg.h"
#include "phydat.h"

#define EMCUTE_PORT         (1883U)
#define EMCUTE_ID           ("gertrud")
#define EMCUTE_PRIO         (THREAD_PRIORITY_MAIN - 1)

static char stack[THREAD_STACKSIZE_DEFAULT];
static msg_t queue[8];

/* Struct containing the sensors data. */
typedef struct sensors {
    int temperature;
    int humidity;
    int windDirection;
    int windIntensity;
    int rainHeight;
} sensors_t;

/* Emcute mqtt thread. */
static void *emcute_thread(void *arg) {
    (void)arg;
    emcute_run(EMCUTE_PORT, EMCUTE_ID);
    return NULL;
}

/* Function for disconnecting from the mqttsn gateway. */
static int discon(void) {
    int res = emcute_discon();
    if (res == EMCUTE_NOGW) {
        puts("error: not connected to any broker");
        return 1;
    }
    else if (res != EMCUTE_OK) {
        puts("error: unable to disconnect");
        return 1;
    }
    puts("Disconnect successful");
    return 0;
}

/* Function for publishing data.
 * The first argument is the string of the topic,
 * the second argument is the message to send,
 * the third argument is the QoS level.
 */
static int pub(char *topic, char *data, int qos) {
    emcute_topic_t t;
    unsigned flags = EMCUTE_QOS_0;

    switch (qos) {
        case 1:
            flags |= EMCUTE_QOS_1;
            break;
        case 2:
            flags |= EMCUTE_QOS_2;
            break;
        default:
            flags |= EMCUTE_QOS_0;
            break;
    }


    /* Step 1: get topic id */
    t.name = topic;
    if (emcute_reg(&t) != EMCUTE_OK) {
        puts("error: unable to obtain topic ID");
        return 1;
    }

    /* Step 2: publish data */
    if (emcute_pub(&t, data, strlen(data), flags) != EMCUTE_OK) {
        printf("error: unable to publish data to topic '%s [%i]'\n",
               t.name, (int)t.id);
        return 1;
    }

    printf("published %s on topic %s\n", data, topic);
    return 0;
}

/* Function for connecting to the mqttsn gateway.
 * The first argument is the address the second is the port.
 */
static int con(char *addr, int port) {
    sock_udp_ep_t gw = { .family = AF_INET6, .port = EMCUTE_PORT };
    gw.port = port;

    /* Parse address */
    if (ipv6_addr_from_str((ipv6_addr_t *)&gw.addr.ipv6, addr) == NULL) {
        printf("error parsing IPv6 address\n");
        return 1;
    }

    if (emcute_con(&gw, true, NULL, NULL, 0, 0) != EMCUTE_OK) {
        printf("error: unable to connect to [%s]:%i\n", addr, port);
        return 1;
    }

    printf("Successfully connected to gateway at [%s]:%i\n", addr, port);
    return 0;
}

/* Function for generating random integer in [lower, upper]. */
static int rand_int(int lower, int upper) {
    return (rand() % (upper - lower + 1)) + lower;
}

/* Function for updating the sensor data. */
static void update_sensors(sensors_t *sensors) {
    saul_reg_t *temp_dev = saul_reg_find_type(SAUL_SENSE_TEMP);
    if (temp_dev == NULL) {
        sensors->temperature = rand_int(-50, 50);
    }
    else {
        phydat_t temp_data;
        saul_reg_read(temp_dev, &temp_data);
        float temp = (float) *temp_data.val;
        sensors->temperature = (int)round(temp/100);
    }

    saul_reg_t *hum_dev = saul_reg_find_type(SAUL_SENSE_HUM);
    if (hum_dev == NULL) {
        sensors->humidity = rand_int(0, 100);
    }
    else {
        phydat_t hum_data;
        saul_reg_read(hum_dev, &hum_data);
        float hum = (float) *hum_data.val;
        sensors->humidity = (int)round(hum/100);
    }

    sensors->windDirection = rand_int(0, 360);
    sensors->windIntensity = rand_int(0, 100);
    sensors->rainHeight = rand_int(0, 50);
}

/* Enviromental station shell command.
 * It takes in input the address and the port of the gateway,
 * the id of the station and the seconds to pass between each publish.
 * It regularly updates the sensor data and publishes it to the topic
 * stations/RiotOSEnvironmentalStation + the id of the station.
 */
static int cmd_env_station(int argc, char **argv) {
    if (argc < 5) {
        printf("usage: %s <address> <port> <id> <seconds>\n", argv[0]);
        return 1;
    }

    char topic[64];
    sprintf(topic, "stations/RiotOSEnvironmentalStation%d", atoi(argv[3]));

    sensors_t sensors;
    char data[128];

    while (1) {
        if (con(argv[1], atoi(argv[2])))
            continue; /* If it cannot connect it retries */

        update_sensors(&sensors);

        sprintf(data, "{\"temperature\": \"%d\", \"humidity\": \"%d\", "
                      "\"windDirection\": \"%d\", \"windIntensity\": \"%d\", "
                      "\"rainHeight\": \"%d\"}",
                      sensors.temperature, sensors.humidity,
                      sensors.windDirection, sensors.windIntensity,
                      sensors.rainHeight);

        if (pub(topic, data, 0)) {
            /* If it cannot publish it disconnects and restarts the loop */
            discon();
            continue;
        }

        discon();

        xtimer_sleep(atoi(argv[4]));
    }

    return 0;
}


static const shell_command_t shell_commands[] = {
    { "env_station", "Environmental station", cmd_env_station },
    { NULL, NULL, NULL }
};

int main(void) {
    /* The main thread needs a msg queue to be able to run `ping6` */
    msg_init_queue(queue, (sizeof(queue) / sizeof(msg_t)));

    /* Start the emcute thread */
    thread_create(stack, sizeof(stack), EMCUTE_PRIO, 0,
                  emcute_thread, NULL, "emcute");

    /* Start shell */
    char line_buf[SHELL_DEFAULT_BUFSIZE];
    shell_run(shell_commands, line_buf, SHELL_DEFAULT_BUFSIZE);

    /* Should be never reached */
    return 0;
}
