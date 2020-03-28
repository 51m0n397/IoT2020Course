#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#include "shell.h"
#include "msg.h"
#include "net/emcute.h"
#include "net/ipv6/addr.h"

#define EMCUTE_PORT         (1883U)
#define EMCUTE_ID           ("gertrud")
#define EMCUTE_PRIO         (THREAD_PRIORITY_MAIN - 1)

static char stack[THREAD_STACKSIZE_DEFAULT];
static msg_t queue[8];

typedef struct sensors{
  int temperature;
  int humidity;
  int windDirection;
  int windIntensity;
  int rainHeight;
}t_sensors;

//emcute mqtt library thread
static void *emcute_thread(void *arg){
    (void)arg;
    emcute_run(EMCUTE_PORT, EMCUTE_ID);
    return NULL;    /* should never be reached */
}

static int discon(void){
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

static int pub(char* topic, char* data, int qos){
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

  printf("pub with topic: %s and name %s and flags 0x%02x\n", topic, data, (int)flags);

  /* step 1: get topic id */
  t.name = topic;
  if (emcute_reg(&t) != EMCUTE_OK) {
      puts("error: unable to obtain topic ID");
      return 1;
  }

  /* step 2: publish data */
  if (emcute_pub(&t, data, strlen(data), flags) != EMCUTE_OK) {
      printf("error: unable to publish data to topic '%s [%i]'\n",
              t.name, (int)t.id);
      return 1;
  }

  printf("Published %i bytes to topic '%s [%i]'\n",
          (int)strlen(data), t.name, t.id);

  return 0;
}

static int con(char* addr, int port){
  sock_udp_ep_t gw = { .family = AF_INET6, .port = EMCUTE_PORT };
  gw.port = port;

  /* parse address */
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

static int rand_int(int lower, int upper) {
  return (rand() % (upper - lower + 1)) + lower;
}

static void update_sensors(t_sensors* sensors){
  sensors->temperature = rand_int(-50, 50);
  sensors->humidity = rand_int(0, 100);
  sensors->windDirection = rand_int(0, 360);
  sensors->windIntensity = rand_int(0, 100);
  sensors->rainHeight = rand_int(0, 50);
}

static int cmd_env_station(int argc, char **argv){
  if (argc < 4) {
      printf("usage: %s <address> <port> <seconds>\n",
              argv[0]);
      return 1;
  }

  char topic[64];
  sprintf(topic,"stations/environmentalStation%d", 0);

  t_sensors sensors;
  char data[128];

  while(1){
    if (con(argv[1], atoi(argv[2]))) {
      return 1;
    }

    update_sensors(&sensors);

    sprintf(data, "{\"temperature\": \"%d\", \"humidity\": \"%d\", \"windDirection\": \"%d\", "
                  "\"windIntensity\": \"%d\", \"rainHeight\": \"%d\"}",
                  sensors.temperature, sensors.humidity, sensors.windDirection,
                  sensors.windIntensity, sensors.rainHeight);

    if (pub(topic, data, 0)){
      return 1;
    }

    if (discon()){
      return 1;
    }

    xtimer_sleep(atoi(argv[3]));
  }

  return 0;
}


static const shell_command_t shell_commands[] = {
    { "env_station", "", cmd_env_station },
    { NULL, NULL, NULL }
};

int main(void){
    /* the main thread needs a msg queue to be able to run `ping6`*/
    msg_init_queue(queue, (sizeof(queue) / sizeof(msg_t)));

    /* start the emcute thread */
    thread_create(stack, sizeof(stack), EMCUTE_PRIO, 0,
                  emcute_thread, NULL, "emcute");

    /* start shell */
    char line_buf[SHELL_DEFAULT_BUFSIZE];
    shell_run(shell_commands, line_buf, SHELL_DEFAULT_BUFSIZE);

    /* should be never reached */
    return 0;
}
